# @pipeworx/the-graph

The Graph MCP — GraphQL queries against blockchain subgraphs.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

- `query_subgraph(subgraph_id, query, variables?)` — run an arbitrary GraphQL query.
- `introspect_schema(subgraph_id)` — fetch the subgraph schema for query construction.

## Auth

- **Platform key:** gateway env `PLATFORM_THEGRAPH_KEY`.
- **BYO:** `?_apiKey=<key>` after signing up at https://thegraph.com/studio/apikeys (free 100k queries/month).

The legacy hosted service is gone; everything routes through the decentralized network gateway at `gateway-arbitrum.network.thegraph.com`.

## Finding subgraph IDs

Browse https://thegraph.com/explorer. Each subgraph's "Query URL" ends in `/subgraphs/id/<the-id-you-want>`.

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "the-graph": {
      "url": "https://gateway.pipeworx.io/the-graph/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/the-graph/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about The Graph data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/query_subgraph \
  -H 'Content-Type: application/json' \
  -d '{"subgraph_id":"5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV","query":"{ pools(first: 5) { id feeTier liquidity } }"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/query_subgraph`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.
