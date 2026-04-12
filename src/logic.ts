import type { Hono } from "hono";

// In-memory cache with TTL
interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_TTL = 15 * 1000; // 15 seconds
const cache = new Map<string, CacheEntry>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function timeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function normalizeDex(dexId: string): string {
  const map: Record<string, string> = {
    raydium: "Raydium",
    "raydium-clmm": "Raydium CLMM",
    "raydium-cp": "Raydium CP",
    orca: "Orca",
    "orca-whirlpool": "Orca Whirlpool",
    meteora: "Meteora",
    "pump-fun": "Pump.fun",
    pumpswap: "PumpSwap",
    "pump-swap": "PumpSwap",
    lifinity: "Lifinity",
  };
  return map[dexId.toLowerCase()] || dexId;
}

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd: string;
  priceNative: string;
  txns: {
    h24: { buys: number; sells: number };
    h1: { buys: number; sells: number };
  };
  volume: { h24: number; h1: number };
  liquidity: { usd: number; base: number; quote: number };
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
  info?: {
    imageUrl?: string;
    websites?: { url: string }[];
    socials?: { type: string; url: string }[];
  };
}

async function fetchLatestSolanaTokens(): Promise<DexScreenerPair[]> {
  const cacheKey = "dexscreener_solana_latest";
  const cached = getCached<DexScreenerPair[]>(cacheKey);
  if (cached) return cached;

  // Strategy 1: DexScreener token boosts (recently boosted = recently launched and trending)
  let pairs: DexScreenerPair[] = [];

  try {
    const boostsResp = await fetch("https://api.dexscreener.com/token-boosts/latest/v1", {
      headers: { Accept: "application/json" },
    });
    if (boostsResp.ok) {
      const boosts = (await boostsResp.json()) as any[];
      // Filter Solana tokens from boosts
      const solanaBoosts = boosts.filter((b: any) => b.chainId === "solana").slice(0, 30);

      // Fetch pair data for each boosted token
      const tokenAddresses = solanaBoosts.map((b: any) => b.tokenAddress).filter(Boolean);
      if (tokenAddresses.length > 0) {
        // DexScreener allows batching up to 30 addresses
        const batchUrl = `https://api.dexscreener.com/tokens/v1/solana/${tokenAddresses.slice(0, 30).join(",")}`;
        const pairsResp = await fetch(batchUrl, {
          headers: { Accept: "application/json" },
        });
        if (pairsResp.ok) {
          const pairsData = (await pairsResp.json()) as DexScreenerPair[];
          if (Array.isArray(pairsData)) {
            pairs.push(...pairsData);
          }
        }
      }
    }
  } catch (_e) {
    // Fallback below
  }

  // Strategy 2: DexScreener search for newest Solana pairs
  if (pairs.length < 10) {
    try {
      const searchResp = await fetch("https://api.dexscreener.com/latest/dex/search?q=sol", {
        headers: { Accept: "application/json" },
      });
      if (searchResp.ok) {
        const searchData = (await searchResp.json()) as { pairs: DexScreenerPair[] };
        const solanaPairs = (searchData.pairs || []).filter(
          (p: DexScreenerPair) => p.chainId === "solana"
        );
        // Merge, avoiding duplicates by pairAddress
        const existingAddrs = new Set(pairs.map((p) => p.pairAddress));
        for (const p of solanaPairs) {
          if (!existingAddrs.has(p.pairAddress)) {
            pairs.push(p);
          }
        }
      }
    } catch (_e) {
      // ignore
    }
  }

  // Sort by creation time (newest first)
  pairs.sort((a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0));

  setCache(cacheKey, pairs);
  return pairs;
}

export function registerRoutes(app: Hono) {
  app.get("/api/launches", async (c) => {
    const limitParam = c.req.query("limit");
    const minLiqParam = c.req.query("minLiquidity");

    const limit = Math.min(Math.max(limitParam ? parseInt(limitParam, 10) : 20, 1), 50);
    const minLiquidity = minLiqParam ? parseFloat(minLiqParam) : 1000;

    let allPairs: DexScreenerPair[];
    try {
      allPairs = await fetchLatestSolanaTokens();
    } catch (err: any) {
      return c.json({ error: "Failed to fetch token data", details: err.message }, 502);
    }

    // Filter by minimum liquidity
    const filtered = allPairs.filter((p) => (p.liquidity?.usd || 0) >= minLiquidity);

    // Deduplicate by base token address (keep highest liquidity pair per token)
    const tokenMap = new Map<string, DexScreenerPair>();
    for (const pair of filtered) {
      const addr = pair.baseToken.address;
      const existing = tokenMap.get(addr);
      if (!existing || (pair.liquidity?.usd || 0) > (existing.liquidity?.usd || 0)) {
        tokenMap.set(addr, pair);
      }
    }

    const deduped = Array.from(tokenMap.values())
      .sort((a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0))
      .slice(0, limit);

    if (deduped.length === 0) {
      return c.json({
        chain: "solana",
        results: 0,
        minLiquidityFilter: minLiquidity,
        tokens: [],
        message: `No recently launched tokens found with liquidity >= $${minLiquidity}. Try lowering the minLiquidity filter.`,
      });
    }

    const tokens = deduped.map((pair) => ({
      mint: pair.baseToken.address,
      name: pair.baseToken.name,
      symbol: pair.baseToken.symbol,
      priceUsd: pair.priceUsd ? parseFloat(pair.priceUsd) : null,
      priceNative: pair.priceNative ? parseFloat(pair.priceNative) : null,
      marketCap: pair.marketCap || pair.fdv || null,
      liquidity: pair.liquidity?.usd || 0,
      volume24h: pair.volume?.h24 || 0,
      volume1h: pair.volume?.h1 || 0,
      buys24h: pair.txns?.h24?.buys || 0,
      sells24h: pair.txns?.h24?.sells || 0,
      buys1h: pair.txns?.h1?.buys || 0,
      sells1h: pair.txns?.h1?.sells || 0,
      buysSellsRatio24h: pair.txns?.h24?.sells
        ? parseFloat(((pair.txns.h24.buys || 0) / pair.txns.h24.sells).toFixed(2))
        : null,
      dex: normalizeDex(pair.dexId),
      pairAddress: pair.pairAddress,
      quoteToken: pair.quoteToken?.symbol || "SOL",
      createdAt: pair.pairCreatedAt ? new Date(pair.pairCreatedAt).toISOString() : null,
      age: pair.pairCreatedAt ? timeAgo(new Date(pair.pairCreatedAt).toISOString()) : null,
      dexScreenerUrl: `https://dexscreener.com/solana/${pair.pairAddress}`,
    }));

    return c.json({
      chain: "solana",
      results: tokens.length,
      totalPairsScanned: allPairs.length,
      minLiquidityFilter: minLiquidity,
      cachedFor: "15s",
      timestamp: new Date().toISOString(),
      tokens,
    });
  });
}
