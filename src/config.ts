import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "solana-launches",
  slug: "solana-launches",
  description: "Scan recently launched tokens on Solana from pump.fun, Raydium, PumpSwap, and Orca.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/launches",
      price: "$0.003",
      description: "Get recently launched tokens on Solana with market data",
      toolName: "solana_scan_new_tokens",
      toolDescription: "Use this when you need to find newly launched tokens on Solana. Returns recent token launches from pump.fun, Raydium, and PumpSwap with mint address, creator, initial liquidity, pool type, market cap, holder count, and age. Do NOT use for token safety — use token_check_safety. Do NOT use for swap quotes — use dex_get_swap_quote.",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of results to return (default: 20, max: 50)",
          },
          minLiquidity: {
            type: "number",
            description: "Minimum liquidity in USD to filter tokens (default: 1000)",
          },
        },
        required: [],
      },
    },
  ],
};
