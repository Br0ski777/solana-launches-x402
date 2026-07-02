# Solana Token Launch Scanner API

[![MCP Server](https://img.shields.io/badge/MCP-server-blue)](https://solana-launches.api.klymax402.com/mcp)
[![x402](https://img.shields.io/badge/payments-x402-6E56CF)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Scan new Solana token launches from pump.fun, Raydium, PumpSwap, Orca -- with liquidity and holder data. Pay-per-call via [x402](https://x402.org) (USDC on Base L2) -- no API key, no signup, no rate-limit wall.

Part of the [klymax402](https://klymax402.com) marketplace -- 100 x402 micropayment APIs for AI agents, one wallet, USDC on Base.

## Quickstart -- MCP

Add to your MCP client config (Claude Desktop, Cursor, ElizaOS, etc.):

```json
{
  "mcpServers": {
    "solana-launches": {
      "url": "https://solana-launches.api.klymax402.com/mcp"
    }
  }
}
```

## Quickstart -- HTTP (x402)

```bash
curl "https://solana-launches.api.klymax402.com/api/launches"
# -> 402 Payment Required, with an x402 payment challenge in the response body
```

Any x402-aware client ([`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch), [`x402-agent-tools`](https://www.npmjs.com/package/x402-agent-tools), ATXP) handles the 402 -> sign -> retry cycle automatically.

## Tools

| Tool | Method | Path | Price | Description |
|---|---|---|---|---|
| `solana_scan_new_tokens` | GET | `/api/launches` | $0.003 | Get recently launched tokens on Solana with market data |

### `solana_scan_new_tokens`

Use this when you need to find newly launched tokens on Solana. Returns recent token launches from pump.fun, Raydium, PumpSwap, and Orca with market data and safety signals.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `limit` | number | no | Number of results to return (default: 20, max: 50) |
| `minLiquidity` | number | no | Minimum liquidity in USD to filter tokens (default: 1000) |

**Returns**

- `tokens` -- array of recently launched tokens sorted by recency
- `totalFound` -- number of tokens matching filters
- `filters` -- applied filters (minLiquidity, limit)

Example response:

```json
{"tokens":[{"mint":"7xKX...","name":"PEPE2","symbol":"PEPE2","creator":"5abc...","poolType":"pump.fun","initialLiquidity":5200,"currentLiquidity":12400,"marketCap":48000,"holderCount":156,"ageMinutes":23}],"totalFound":45,"filters":{"minLiquidity":1000,"limit":20}}
```

**When to use**: discovering early-stage Solana tokens, monitoring new launches, or building sniper/scanner bots. Essential for identifying opportunities before they trend.

## Example agent prompts

- "Find newly launched tokens on Solana"

## Payment

- Protocol: [x402](https://x402.org) -- HTTP-native pay-per-call, no signup, no API key
- Network: Base L2 (`eip155:8453`)
- Asset: USDC
- Facilitator: Coinbase CDP (primary), PayAI (fallback)
- Also reachable via [ATXP](https://atxp.ai) (OAuth-wrapped x402, RFC 9728 protected-resource metadata)

## Part of klymax402

100 x402 micropayment APIs for AI agents -- one wallet, USDC on Base, zero signup.

- Catalog: https://klymax402.com/llms.txt
- Full API reference: https://klymax402.com/llms-full.txt
- Live stats: https://klymax402.com/stats

## License

MIT
