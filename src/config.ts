import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "solana-launches",
  slug: "solana-launches",
  description: "Scan new Solana token launches from pump.fun, Raydium, PumpSwap, Orca -- with liquidity and holder data.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/launches",
      price: "$0.003",
      description: "Get recently launched tokens on Solana with market data",
      toolName: "solana_scan_new_tokens",
      toolDescription: `Use this when you need to find newly launched tokens on Solana. Returns recent token launches from pump.fun, Raydium, PumpSwap, and Orca with market data and safety signals.

1. tokens: array of recently launched tokens sorted by recency
2. Each token contains: mint (address), name, symbol, creator, poolType (pump.fun/Raydium/PumpSwap/Orca), initialLiquidity, currentLiquidity, marketCap, holderCount, ageMinutes
3. totalFound: number of tokens matching filters
4. filters: applied filters (minLiquidity, limit)

Example output: {"tokens":[{"mint":"7xKX...","name":"PEPE2","symbol":"PEPE2","creator":"5abc...","poolType":"pump.fun","initialLiquidity":5200,"currentLiquidity":12400,"marketCap":48000,"holderCount":156,"ageMinutes":23}],"totalFound":45,"filters":{"minLiquidity":1000,"limit":20}}

Use this FOR discovering early-stage Solana tokens, monitoring new launches, or building sniper/scanner bots. Essential for identifying opportunities before they trend.

Do NOT use for token safety checks -- use token_check_safety. Do NOT use for swap quotes -- use jupiter_get_swap_quote. Do NOT use for pool liquidity depth -- use solana_scan_pool_liquidity.`,
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
