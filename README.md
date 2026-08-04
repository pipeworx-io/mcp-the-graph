# @pipeworx/the-graph

The Graph MCP — GraphQL queries against blockchain subgraphs.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about The Graph data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
