interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * The Graph MCP — indexed blockchain data via subgraph GraphQL queries
 *
 * The Graph runs subgraphs that index events from EVM chains (and a growing
 * set of L2s + Solana) and expose them via GraphQL. Pairs with `etherscan`
 * (raw chain access) for protocol-specific aggregated queries: Uniswap
 * volumes, Aave positions, ENS records, etc.
 *
 * The legacy hosted service has shut down — queries now go through the
 * decentralized network gateway at `gateway-arbitrum.network.thegraph.com`
 * with an API key. Free tier 100k queries/month after Graph Studio signup.
 *
 * API: https://thegraph.com/docs/en/querying/querying-the-graph/
 * Tools:
 * - query_subgraph: run a GraphQL query against a subgraph by its hash ID
 * - introspect_schema: fetch the subgraph's GraphQL schema (types + fields)
 */


const GATEWAY = 'https://gateway-arbitrum.network.thegraph.com';

const tools: McpToolExport['tools'] = [
  {
    name: 'query_subgraph',
    description:
      'Run a GraphQL query against a subgraph on The Graph network. subgraph_id is the deployment hash (starts with "Qm…" or the new "0x…" subgraph ID from thegraph.com/explorer). Returns the GraphQL `data` block plus any errors.',
    inputSchema: {
      type: 'object',
      properties: {
        subgraph_id: {
          type: 'string',
          description:
            'Subgraph deployment ID (look up at thegraph.com/explorer; e.g., Uniswap v3 Ethereum is "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV")',
        },
        query: { type: 'string', description: 'GraphQL query string' },
        variables: { type: 'object', description: 'Optional GraphQL variables object' },
      },
      required: ['subgraph_id', 'query'],
    },
  },
  {
    name: 'introspect_schema',
    description:
      'Fetch a subgraph\'s GraphQL schema via standard introspection. Returns types, fields, and arguments so an agent can build queries without external docs.',
    inputSchema: {
      type: 'object',
      properties: {
        subgraph_id: { type: 'string', description: 'Subgraph deployment ID' },
      },
      required: ['subgraph_id'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = (args._apiKey as string | undefined)?.trim();
  if (!apiKey) {
    throw new Error(
      'The Graph requires an API key. Contact the operator about platform credentials, or BYO via ?_apiKey=<key> after registering at https://thegraph.com/studio/apikeys (free 100k queries/month).',
    );
  }
  switch (name) {
    case 'query_subgraph':
      return querySubgraph(
        apiKey,
        reqStr(args, 'subgraph_id', '"5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV"'),
        reqStr(args, 'query', '"{ pools(first:1) { id volumeUSD } }"'),
        args.variables as Record<string, unknown> | undefined,
      );
    case 'introspect_schema':
      return introspectSchema(apiKey, reqStr(args, 'subgraph_id', '"5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV"'));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing or empty. Pass a string like ${example}.`);
  }
  return v;
}

async function graphPost<T>(apiKey: string, subgraphId: string, body: unknown): Promise<T> {
  const url = `${GATEWAY}/api/${apiKey}/subgraphs/id/${encodeURIComponent(subgraphId)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 401 || res.status === 403) throw new Error('The Graph: unauthorized — check the API key');
  if (res.status === 404) throw new Error('The Graph: subgraph not found at that ID');
  if (res.status === 429) throw new Error('The Graph: rate-limit (HTTP 429)');
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`The Graph error: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

async function querySubgraph(
  apiKey: string,
  subgraphId: string,
  query: string,
  variables: Record<string, unknown> | undefined,
) {
  const data = await graphPost<{
    data?: unknown;
    errors?: { message?: string; locations?: unknown; path?: unknown }[];
  }>(apiKey, subgraphId, { query, variables });

  return {
    subgraph_id: subgraphId,
    data: data.data ?? null,
    errors: data.errors ?? [],
  };
}

const INTROSPECTION_QUERY = `
query IntrospectionQuery {
  __schema {
    queryType { name }
    types {
      kind
      name
      description
      fields(includeDeprecated: true) {
        name
        description
        type { kind name ofType { kind name ofType { kind name } } }
        args { name description type { kind name ofType { kind name } } }
      }
      enumValues(includeDeprecated: true) { name description }
    }
  }
}`;

interface IntrospectionField {
  name?: string;
  description?: string;
  type?: TypeRef;
  args?: { name?: string; description?: string; type?: TypeRef }[];
}

interface IntrospectionType {
  kind?: string;
  name?: string;
  description?: string;
  fields?: IntrospectionField[];
  enumValues?: { name?: string; description?: string }[];
}

interface TypeRef {
  kind?: string;
  name?: string | null;
  ofType?: TypeRef | null;
}

function flattenTypeRef(ref?: TypeRef | null): string {
  if (!ref) return 'Unknown';
  if (ref.kind === 'NON_NULL') return `${flattenTypeRef(ref.ofType)}!`;
  if (ref.kind === 'LIST') return `[${flattenTypeRef(ref.ofType)}]`;
  return ref.name ?? 'Unknown';
}

async function introspectSchema(apiKey: string, subgraphId: string) {
  const data = await graphPost<{
    data?: { __schema?: { queryType?: { name?: string }; types?: IntrospectionType[] } };
    errors?: { message?: string }[];
  }>(apiKey, subgraphId, { query: INTROSPECTION_QUERY });

  if (data.errors?.length) {
    throw new Error(`Introspection rejected: ${data.errors[0].message ?? 'unknown'}`);
  }

  const types = data.data?.__schema?.types ?? [];
  const userTypes = types
    .filter((t) => t.name && !t.name.startsWith('__') && t.kind === 'OBJECT')
    .map((t) => ({
      name: t.name ?? null,
      description: t.description ?? null,
      fields: (t.fields ?? []).map((f) => ({
        name: f.name ?? null,
        description: f.description ?? null,
        type: flattenTypeRef(f.type),
        args: (f.args ?? []).map((a) => ({
          name: a.name ?? null,
          type: flattenTypeRef(a.type),
        })),
      })),
    }));

  const enums = types
    .filter((t) => t.kind === 'ENUM' && !t.name?.startsWith('__'))
    .map((t) => ({
      name: t.name ?? null,
      values: (t.enumValues ?? []).map((v) => v.name).filter(Boolean),
    }));

  return {
    subgraph_id: subgraphId,
    query_type: data.data?.__schema?.queryType?.name ?? null,
    object_count: userTypes.length,
    enum_count: enums.length,
    objects: userTypes,
    enums,
  };
}

export default { tools, callTool, meter: { credits: 2 } } satisfies McpToolExport;
