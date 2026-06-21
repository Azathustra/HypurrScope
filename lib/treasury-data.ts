import { fetchCryptoLivePrices } from "@/lib/crypto-live-prices";
import { formatCompactUsd, formatUsd } from "@/lib/market-data";

export type TreasuryCategory = "etfs" | "companies" | "governments";

export type TreasuryItem = {
  rank: number;
  name: string;
  ticker?: string;
  country?: string;
  amount: string;
  amountValue?: number;
  marketPrice: string;
  marketPriceValue?: number;
  marketCap: string;
  marketCapValue?: number;
  nav: string;
  navValue?: number;
  mnav: string;
  share?: string;
  note?: string;
};

export type TreasurySection = {
  id: TreasuryCategory;
  title: string;
  shortTitle: string;
  description: string;
  sourceUrl: string;
  sourceLabel: string;
  unit: string;
  totalAmount: string;
  totalAmountValue: number;
  totalNav: string;
  totalNavValue: number;
  rows: TreasuryItem[];
};

export type TreasuryAsset = {
  symbol: "BTC" | "ETH";
  name: string;
  supply: number;
  price: string;
  priceValue?: number;
  totalAmount: string;
  totalAmountValue: number;
  totalNav: string;
  totalNavValue: number;
  supplyShare: string;
  sections: TreasurySection[];
};

export type CryptoTreasuryData = {
  updatedAt: string;
  assets: TreasuryAsset[];
};

type RawTreasuryItem = {
  rank: number;
  name: string;
  ticker?: string;
  country?: string;
  amount: string;
  amountValue?: number;
  sourceValue?: string;
  sourceValueValue?: number;
  share?: string;
  note?: string;
};

type MarketProfile = {
  price?: number;
  marketCap?: number;
};

const sources = {
  btcCompanies: "https://bitcointreasuries.net/",
  btcEtfs: "https://bitcointreasuries.net/etfs-and-exchanges",
  btcGovernments: "https://bitcointreasuries.net/governments",
  ethCompanies: "https://bitcointreasuries.net/ethereum",
  ethEtfs: "https://www.investopedia.com/spot-ether-etfs-start-trading-tk-here-s-what-you-need-to-know-8680846"
};

const supplies = {
  BTC: 21_000_000,
  ETH: 120_700_000
};

const TREASURY_SOURCE_CACHE_MS = 10 * 60 * 1000;
const MARKET_PROFILE_CACHE_MS = 5 * 60 * 1000;

let sourceCache: {
  at: number;
  rows: {
    btcCompanies: RawTreasuryItem[];
    btcEtfs: RawTreasuryItem[];
    btcGovernments: RawTreasuryItem[];
    ethCompanies: RawTreasuryItem[];
  };
} | null = null;

let profileCache: {
  at: number;
  key: string;
  profiles: Map<string, MarketProfile>;
} | null = null;

export async function getCryptoTreasuryData(): Promise<CryptoTreasuryData> {
  const [sourceRows, livePrices] = await Promise.all([getTreasurySourceRows(), fetchCryptoLivePrices(["BTC", "ETH"])]);
  const btcPrice = livePrices.find((price) => price.ticker === "BTC")?.priceValue;
  const ethPrice = livePrices.find((price) => price.ticker === "ETH")?.priceValue;
  const { btcCompanies, btcEtfs, btcGovernments, ethCompanies } = sourceRows;

  const profiles = await getMarketProfiles([
    ...btcEtfs,
    ...btcCompanies,
    ...ethEtfs,
    ...ethCompanies
  ]);

  const btcSections = [
    makeSection({
      id: "etfs",
      title: "Detailed BTC ETF holdings",
      shortTitle: "ETFs",
      description: "ETF, trusts, ETP et custodians classes par BTC sous gestion.",
      sourceUrl: sources.btcEtfs,
      sourceLabel: "BitcoinTreasuries",
      unit: "BTC",
      spotPrice: btcPrice,
      rows: btcEtfs,
      profiles
    }),
    makeSection({
      id: "companies",
      title: "Societes qui accumulent du BTC",
      shortTitle: "Companies",
      description: "Entreprises publiques ou cotees avec Bitcoin au bilan.",
      sourceUrl: sources.btcCompanies,
      sourceLabel: "BitcoinTreasuries",
      unit: "BTC",
      spotPrice: btcPrice,
      rows: btcCompanies,
      profiles
    }),
    makeSection({
      id: "governments",
      title: "Gouvernements et entites publiques BTC",
      shortTitle: "Governments",
      description: "Reserves BTC suivies par pays, etats ou agences publiques.",
      sourceUrl: sources.btcGovernments,
      sourceLabel: "BitcoinTreasuries",
      unit: "BTC",
      spotPrice: btcPrice,
      rows: btcGovernments,
      profiles
    })
  ];

  const ethSections = [
    makeSection({
      id: "etfs",
      title: "Detailed ETH ETF holdings",
      shortTitle: "ETFs",
      description: "ETF spot Ethereum cotes aux Etats-Unis et vehicules majeurs suivis.",
      sourceUrl: sources.ethEtfs,
      sourceLabel: "Investopedia",
      unit: "ETH",
      spotPrice: ethPrice,
      rows: ethEtfs,
      profiles
    }),
    makeSection({
      id: "companies",
      title: "Societes qui accumulent de l'ETH",
      shortTitle: "Companies",
      description: "Entreprises et institutions suivies par solde ETH.",
      sourceUrl: sources.ethCompanies,
      sourceLabel: "BitcoinTreasuries",
      unit: "ETH",
      spotPrice: ethPrice,
      rows: ethCompanies,
      profiles
    }),
    makeSection({
      id: "governments",
      title: "Gouvernements et entites publiques ETH",
      shortTitle: "Governments",
      description: "Aucune reserve gouvernementale ETH consolidee n'est publiee par les sources suivies.",
      sourceUrl: sources.ethCompanies,
      sourceLabel: "BitcoinTreasuries",
      unit: "ETH",
      spotPrice: ethPrice,
      rows: ethGovernments,
      profiles
    })
  ];

  return {
    updatedAt: new Date().toISOString(),
    assets: [
      makeAsset("BTC", "Bitcoin", btcPrice, btcSections),
      makeAsset("ETH", "Ethereum", ethPrice, ethSections)
    ]
  };
}

async function getTreasurySourceRows() {
  const now = Date.now();
  if (sourceCache && now - sourceCache.at < TREASURY_SOURCE_CACHE_MS) {
    return cloneSourceRows(sourceCache.rows);
  }

  const [btcCompaniesHtml, btcEtfsHtml, btcGovernmentsHtml, ethCompaniesHtml] = await Promise.all([
    fetchTreasuryPage(sources.btcCompanies),
    fetchTreasuryPage(sources.btcEtfs),
    fetchTreasuryPage(sources.btcGovernments),
    fetchTreasuryPage(sources.ethCompanies)
  ]);

  const rows = {
    btcCompanies: parseBtcCompanies(btcCompaniesHtml) || sourceCache?.rows.btcCompanies || fallbackBtcCompanies,
    btcEtfs: parseBtcEtfs(btcEtfsHtml) || sourceCache?.rows.btcEtfs || fallbackBtcEtfs,
    btcGovernments: parseBtcGovernments(btcGovernmentsHtml) || sourceCache?.rows.btcGovernments || fallbackBtcGovernments,
    ethCompanies: parseEthCompanies(ethCompaniesHtml) || sourceCache?.rows.ethCompanies || fallbackEthCompanies
  };

  sourceCache = {
    at: now,
    rows: cloneSourceRows(rows)
  };

  return cloneSourceRows(rows);
}

function cloneSourceRows(rows: {
  btcCompanies: RawTreasuryItem[];
  btcEtfs: RawTreasuryItem[];
  btcGovernments: RawTreasuryItem[];
  ethCompanies: RawTreasuryItem[];
}) {
  return {
    btcCompanies: rows.btcCompanies.map((row) => ({ ...row })),
    btcEtfs: rows.btcEtfs.map((row) => ({ ...row })),
    btcGovernments: rows.btcGovernments.map((row) => ({ ...row })),
    ethCompanies: rows.ethCompanies.map((row) => ({ ...row }))
  };
}

async function fetchTreasuryPage(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0"
      },
      cache: "no-store"
    });

    return response.ok ? response.text() : "";
  } catch {
    return "";
  }
}

function parseBtcCompanies(html: string) {
  const rows = tableRows(html)
    .map((cells) => {
      const [rank, name, country, ticker, amount, meta] = cells;
      if (!rank || !name || !amount) return null;

      return makeRawItem({
        rank,
        name,
        ticker,
        country,
        amount,
        share: meta?.replace(/\[|\]/g, "") || undefined
      });
    })
    .filter(isRawTreasuryItem)
    .slice(0, 40);

  return rows.length ? rows : null;
}

function parseBtcEtfs(html: string) {
  const rows = tableRows(html)
    .map((cells) => {
      const [rank, country, rawName, amount, sourceValue, share] = cells;
      if (!rank || !rawName || !amount) return null;
      const { name, ticker } = splitTrailingTicker(rawName);

      return makeRawItem({ rank, name, ticker, country, amount, sourceValue, share });
    })
    .filter(isRawTreasuryItem)
    .slice(0, 40);

  return rows.length ? rows : null;
}

function parseBtcGovernments(html: string) {
  const rows = tableRows(html)
    .map((cells) => {
      const [rank, country, name, amount, sourceValue, share] = cells;
      if (!rank || !name || !amount) return null;

      return makeRawItem({ rank, name, country, amount, sourceValue, share });
    })
    .filter(isRawTreasuryItem)
    .slice(0, 30);

  return rows.length ? rows : null;
}

function parseEthCompanies(html: string) {
  const rows = tableRows(html)
    .map((cells) => {
      const [rank, country, rawName, amount, sourceValue] = cells;
      if (!rank || !rawName || !amount) return null;
      const { name, ticker } = splitTrailingTicker(rawName);

      return makeRawItem({ rank, name, ticker, country, amount, sourceValue });
    })
    .filter(isRawTreasuryItem)
    .slice(0, 40);

  return rows.length ? rows : null;
}

function tableRows(html: string) {
  const body = html.match(/<tbody[\s\S]*?<\/tbody>/)?.[0] ?? "";

  return [...body.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((row) =>
    [...row[0].matchAll(/<td[\s\S]*?<\/td>/g)].map((cell) => cleanCell(cell[0])).filter(Boolean)
  );
}

function cleanCell(value: string) {
  return value
    .replace(/\s(?:class|data-[\w-]+|aria-[\w-]+|style|href|src|alt|title|role|target|rel|type|tabindex|width|height|viewBox|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|d|x|y|cx|cy|r)=(["']).*?\1/g, "")
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

function splitTrailingTicker(value: string) {
  const match = value.match(/^(.*?)(?:\s+([A-Z0-9.-]{2,14}))$/);
  if (!match) return { name: value };

  const [, name, ticker] = match;
  if (name.length < 4 || ticker.includes(",")) return { name: value };
  return { name: name.trim(), ticker };
}

async function getMarketProfiles(rows: RawTreasuryItem[]) {
  const tickers = [
    ...new Set(
      rows
        .map((row) => row.ticker)
        .filter((ticker): ticker is string => Boolean(ticker))
        .map((ticker) => ticker.toUpperCase().replace(".", "-"))
    )
  ].slice(0, 90);
  const cacheKey = tickers.join(",");
  const now = Date.now();

  if (profileCache && profileCache.key === cacheKey && now - profileCache.at < MARKET_PROFILE_CACHE_MS) {
    return new Map(profileCache.profiles);
  }

  const profiles = await fetchMarketProfiles(tickers);
  profileCache = {
    at: now,
    key: cacheKey,
    profiles: new Map(profiles)
  };

  return profiles;
}

async function fetchMarketProfiles(tickers: string[]) {
  const entries = await mapLimit(tickers, 12, async (ticker, index) => [ticker, await fetchMarketProfile(ticker, index < 35)] as const);
  return new Map(entries.filter((entry): entry is readonly [string, MarketProfile] => Boolean(entry[1])));
}

async function fetchMarketProfile(ticker: string, includeMarketCap: boolean): Promise<MarketProfile | null> {
  const [price, marketCap] = await Promise.all([
    fetchYahooPrice(ticker),
    includeMarketCap ? fetchStockAnalysisMarketCap(ticker) : Promise.resolve(undefined)
  ]);

  if (!price && !marketCap) return null;
  return { price, marketCap };
}

async function fetchYahooPrice(ticker: string) {
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 60 }
    });
    if (!response.ok) return undefined;

    const payload = await response.json();
    const price = payload?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" && Number.isFinite(price) ? price : undefined;
  } catch {
    return undefined;
  }
}

async function fetchStockAnalysisMarketCap(ticker: string) {
  const lower = ticker.toLowerCase();
  const urls = [`https://stockanalysis.com/stocks/${lower}/`, `https://stockanalysis.com/etf/${lower}/`];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 900 }
      });
      if (!response.ok) continue;

      const text = stripHtml(await response.text());
      const marketCap = text.match(/Market Cap\s+([0-9.]+[TBMK]?)/i)?.[1];
      const assets = text.match(/Assets\s+\$?([0-9.]+[TBMK]?)/i)?.[1];
      const value = parseCompactValue(marketCap ?? assets ?? "");
      if (value) return value;
    } catch {
      continue;
    }
  }

  return undefined;
}

function makeSection({
  id,
  title,
  shortTitle,
  description,
  sourceUrl,
  sourceLabel,
  unit,
  spotPrice,
  rows,
  profiles
}: {
  id: TreasuryCategory;
  title: string;
  shortTitle: string;
  description: string;
  sourceUrl: string;
  sourceLabel: string;
  unit: string;
  spotPrice?: number;
  rows: RawTreasuryItem[];
  profiles: Map<string, MarketProfile>;
}): TreasurySection {
  const enrichedRows = rows.map((row) => enrichRow(row, unit, spotPrice, profiles));
  const totalAmountValue = enrichedRows.reduce((total, row) => total + (row.amountValue ?? 0), 0);
  const totalNavValue = enrichedRows.reduce((total, row) => total + (row.navValue ?? 0), 0);

  return {
    id,
    title,
    shortTitle,
    description,
    sourceUrl,
    sourceLabel,
    unit,
    totalAmount: formatTokenAmount(totalAmountValue),
    totalAmountValue,
    totalNav: formatCompactUsd(totalNavValue),
    totalNavValue,
    rows: enrichedRows
  };
}

function enrichRow(row: RawTreasuryItem, unit: string, spotPrice: number | undefined, profiles: Map<string, MarketProfile>): TreasuryItem {
  const profile = row.ticker ? profiles.get(row.ticker.toUpperCase().replace(".", "-")) : undefined;
  const navValue = row.amountValue && spotPrice ? row.amountValue * spotPrice : row.sourceValueValue;
  const marketCapValue = profile?.marketCap;
  const mnav = marketCapValue && navValue ? (marketCapValue / navValue).toFixed(3) : "-";

  return {
    rank: row.rank,
    name: row.name,
    ticker: row.ticker,
    country: row.country,
    amount: row.amountValue ? formatTokenAmount(row.amountValue) : row.amount,
    amountValue: row.amountValue,
    marketPrice: profile?.price ? formatUsd(profile.price) : "-",
    marketPriceValue: profile?.price,
    marketCap: marketCapValue ? formatCompactUsd(marketCapValue) : "-",
    marketCapValue,
    nav: navValue ? formatCompactUsd(navValue) : row.sourceValue ?? "-",
    navValue,
    mnav,
    share: row.share,
    note: row.note
  };
}

function makeAsset(symbol: "BTC" | "ETH", name: string, priceValue: number | undefined, sections: TreasurySection[]): TreasuryAsset {
  const totalAmountValue = sections.reduce((total, section) => total + section.totalAmountValue, 0);
  const totalNavValue = sections.reduce((total, section) => total + section.totalNavValue, 0);
  const supply = supplies[symbol];

  return {
    symbol,
    name,
    supply,
    price: priceValue ? formatUsd(priceValue) : "-",
    priceValue,
    totalAmount: formatTokenAmount(totalAmountValue),
    totalAmountValue,
    totalNav: formatCompactUsd(totalNavValue),
    totalNavValue,
    supplyShare: `${((totalAmountValue / supply) * 100).toFixed(2)}%`,
    sections
  };
}

function makeRawItem({
  rank,
  name,
  ticker,
  country,
  amount,
  sourceValue,
  share,
  note
}: {
  rank: string;
  name: string;
  ticker?: string;
  country?: string;
  amount: string;
  sourceValue?: string;
  share?: string;
  note?: string;
}): RawTreasuryItem {
  const amountValue = parseAmount(amount);
  const sourceValueValue = parseMoney(sourceValue ?? "");

  return {
    rank: Number(rank.replace(/\D/g, "")) || 0,
    name,
    ticker: ticker || undefined,
    country: country || undefined,
    amount,
    amountValue,
    sourceValue,
    sourceValueValue,
    share: share || undefined,
    note
  };
}

function parseAmount(value: string) {
  const cleaned = value.replace(/[^\d.-]/g, "");
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseMoney(value: string) {
  return parseCompactValue(value.replace("$", "").replaceAll(",", ""));
}

function parseCompactValue(value: string) {
  const match = value.replaceAll(",", "").trim().match(/^([0-9.]+)\s*([TBMK])?$/i);
  if (!match) return undefined;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return undefined;

  const unit = match[2]?.toUpperCase();
  if (unit === "T") return amount * 1_000_000_000_000;
  if (unit === "B") return amount * 1_000_000_000;
  if (unit === "M") return amount * 1_000_000;
  if (unit === "K") return amount * 1_000;
  return amount;
}

function formatTokenAmount(value: number) {
  if (!Number.isFinite(value)) return "-";

  return new Intl.NumberFormat("en-US", {
    notation: value >= 100000 ? "compact" : "standard",
    maximumFractionDigits: value >= 100000 ? 2 : 0
  }).format(value);
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>) {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      const current = items[index];
      index += 1;
      results.push(await fn(current, currentIndex));
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function isRawTreasuryItem(value: RawTreasuryItem | null): value is RawTreasuryItem {
  return Boolean(value);
}

const fallbackBtcEtfs: RawTreasuryItem[] = [
  makeRawItem({ rank: "1", country: "US", name: "iShares Bitcoin Trust", ticker: "IBIT", amount: "811,291", sourceValue: "$51,831M", share: "3.863%" }),
  makeRawItem({ rank: "2", country: "US", name: "Fidelity Wise Origin Bitcoin Fund", ticker: "FBTC", amount: "185,798", sourceValue: "$11,870M", share: "0.885%" }),
  makeRawItem({ rank: "3", country: "US", name: "Grayscale Bitcoin Trust", ticker: "GBTC", amount: "150,744", sourceValue: "$9,630M", share: "0.718%" }),
  makeRawItem({ rank: "4", country: "US", name: "Grayscale Bitcoin Mini Trust", ticker: "BTC", amount: "53,002", sourceValue: "$3,386M", share: "0.252%" }),
  makeRawItem({ rank: "5", country: "US", name: "Bitwise Bitcoin ETF", ticker: "BITB", amount: "38,501", sourceValue: "$2,472M", share: "0.183%" })
];

const fallbackBtcCompanies: RawTreasuryItem[] = [
  makeRawItem({ rank: "1", country: "US", name: "Strategy", ticker: "MSTR", amount: "846,842", share: "0.80" }),
  makeRawItem({ rank: "2", country: "US", name: "Twenty One Capital", ticker: "XXI", amount: "43,514", share: "1.35" }),
  makeRawItem({ rank: "3", country: "JP", name: "Metaplanet Inc.", ticker: "MPJPY", amount: "40,177", share: "0.82" }),
  makeRawItem({ rank: "4", country: "US", name: "MARA Holdings, Inc.", ticker: "MARA", amount: "36,303", share: "2.93" }),
  makeRawItem({ rank: "5", country: "US", name: "Bitcoin Standard Treasury Company", ticker: "BSTR", amount: "30,021" })
];

const fallbackBtcGovernments: RawTreasuryItem[] = [
  makeRawItem({ rank: "1", country: "US", name: "United States", amount: "328,372", sourceValue: "$20,978M", share: "1.564%" }),
  makeRawItem({ rank: "2", country: "CN", name: "China", amount: "190,000", sourceValue: "$12,138M", share: "0.905%" }),
  makeRawItem({ rank: "3", country: "GB", name: "United Kingdom", amount: "61,245", sourceValue: "$3,913M", share: "0.292%" }),
  makeRawItem({ rank: "4", country: "UA", name: "Ukraine (holdings of public officials)", amount: "46,351", sourceValue: "$2,961M", share: "0.221%" }),
  makeRawItem({ rank: "5", country: "SV", name: "El Salvador", amount: "7,689", sourceValue: "$491M", share: "0.037%" })
];

const fallbackEthCompanies: RawTreasuryItem[] = [
  makeRawItem({ rank: "1", country: "US", name: "BitMine Immersion Technologies, Inc.", amount: "5,543,872", sourceValue: "$9.51B" }),
  makeRawItem({ rank: "2", country: "IL", name: "Sharplink, Inc.", amount: "863,424", sourceValue: "$1.48B" }),
  makeRawItem({ rank: "3", country: "US", name: "The Ether Machine", amount: "495,362", sourceValue: "$849.82M" }),
  makeRawItem({ rank: "4", country: "US", name: "Bit Digital, Inc.", ticker: "BTBT", amount: "155,239", sourceValue: "$266.32M" }),
  makeRawItem({ rank: "5", country: "US", name: "ETHZilla Corp", amount: "94,030", sourceValue: "$161.31M" })
];

const ethEtfs: RawTreasuryItem[] = [
  makeRawItem({ rank: "1", country: "US", name: "iShares Ethereum Trust ETF", ticker: "ETHA", amount: "Spot ETH", sourceValue: "BlackRock" }),
  makeRawItem({ rank: "2", country: "US", name: "Grayscale Ethereum Trust", ticker: "ETHE", amount: "Spot ETH", sourceValue: "Grayscale" }),
  makeRawItem({ rank: "3", country: "US", name: "Fidelity Ethereum Fund", ticker: "FETH", amount: "Spot ETH", sourceValue: "Fidelity" }),
  makeRawItem({ rank: "4", country: "US", name: "Bitwise Ethereum ETF", ticker: "ETHW", amount: "Spot ETH", sourceValue: "Bitwise" }),
  makeRawItem({ rank: "5", country: "US", name: "VanEck Ethereum ETF", ticker: "ETHV", amount: "Spot ETH", sourceValue: "VanEck" }),
  makeRawItem({ rank: "6", country: "US", name: "Franklin Ethereum ETF", ticker: "EZET", amount: "Spot ETH", sourceValue: "Franklin" }),
  makeRawItem({ rank: "7", country: "US", name: "21Shares Core Ethereum ETF", ticker: "CETH", amount: "Spot ETH", sourceValue: "21Shares" }),
  makeRawItem({ rank: "8", country: "US", name: "Invesco Galaxy Ethereum ETF", ticker: "QETH", amount: "Spot ETH", sourceValue: "Invesco Galaxy" })
];

const ethGovernments: RawTreasuryItem[] = [
  makeRawItem({
    rank: "1",
    name: "Aucune reserve ETH gouvernementale consolidee",
    amount: "-",
    sourceValue: "-",
    note: "La page est prete pour brancher les pays si une source publique fiable publie des soldes ETH."
  })
];
