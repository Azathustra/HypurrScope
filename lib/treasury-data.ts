export type TreasuryItem = {
  rank: number;
  name: string;
  ticker?: string;
  country?: string;
  amount: string;
  amountValue?: number;
  usdValue: string;
  share?: string;
  note?: string;
};

export type TreasurySection = {
  title: string;
  description: string;
  sourceUrl: string;
  sourceLabel: string;
  unit: string;
  rows: TreasuryItem[];
};

export type TreasuryAsset = {
  symbol: "BTC" | "ETH";
  name: string;
  sections: TreasurySection[];
};

export type CryptoTreasuryData = {
  updatedAt: string;
  assets: TreasuryAsset[];
};

const sources = {
  btcCompanies: "https://bitcointreasuries.net/",
  btcEtfs: "https://bitcointreasuries.net/etfs-and-exchanges",
  btcGovernments: "https://bitcointreasuries.net/governments",
  ethCompanies: "https://bitcointreasuries.net/ethereum",
  ethEtfs: "https://www.investopedia.com/spot-ether-etfs-start-trading-tk-here-s-what-you-need-to-know-8680846"
};

export async function getCryptoTreasuryData(): Promise<CryptoTreasuryData> {
  const [btcCompaniesHtml, btcEtfsHtml, btcGovernmentsHtml, ethCompaniesHtml] = await Promise.all([
    fetchTreasuryPage(sources.btcCompanies),
    fetchTreasuryPage(sources.btcEtfs),
    fetchTreasuryPage(sources.btcGovernments),
    fetchTreasuryPage(sources.ethCompanies)
  ]);

  const btcCompanies = parseBtcCompanies(btcCompaniesHtml) || fallbackBtcCompanies;
  const btcEtfs = parseBtcEtfs(btcEtfsHtml) || fallbackBtcEtfs;
  const btcGovernments = parseBtcGovernments(btcGovernmentsHtml) || fallbackBtcGovernments;
  const ethCompanies = parseEthCompanies(ethCompaniesHtml) || fallbackEthCompanies;

  return {
    updatedAt: new Date().toISOString(),
    assets: [
      {
        symbol: "BTC",
        name: "Bitcoin",
        sections: [
          {
            title: "ETF, fonds et exchanges BTC",
            description: "Vehicules cotes, trusts, ETP et custodians classes par BTC sous gestion.",
            sourceUrl: sources.btcEtfs,
            sourceLabel: "BitcoinTreasuries",
            unit: "BTC",
            rows: btcEtfs
          },
          {
            title: "Societes qui accumulent du BTC",
            description: "Entreprises publiques avec Bitcoin au bilan.",
            sourceUrl: sources.btcCompanies,
            sourceLabel: "BitcoinTreasuries",
            unit: "BTC",
            rows: btcCompanies
          },
          {
            title: "Gouvernements et entites publiques BTC",
            description: "Reserves BTC suivies par pays, etats ou agences publiques.",
            sourceUrl: sources.btcGovernments,
            sourceLabel: "BitcoinTreasuries",
            unit: "BTC",
            rows: btcGovernments
          }
        ]
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        sections: [
          {
            title: "ETF spot ETH",
            description: "Principaux ETF spot Ethereum cotes aux Etats-Unis. Les holdings detaillees varient par emetteur.",
            sourceUrl: sources.ethEtfs,
            sourceLabel: "Investopedia",
            unit: "ETH",
            rows: ethEtfs
          },
          {
            title: "Societes qui accumulent de l'ETH",
            description: "Entreprises et institutions suivies par solde ETH.",
            sourceUrl: sources.ethCompanies,
            sourceLabel: "BitcoinTreasuries",
            unit: "ETH",
            rows: ethCompanies
          },
          {
            title: "Gouvernements et entites publiques ETH",
            description: "Aucune reserve gouvernementale ETH consolidee n'est publiee par les sources suivies.",
            sourceUrl: sources.ethCompanies,
            sourceLabel: "BitcoinTreasuries",
            unit: "ETH",
            rows: ethGovernments
          }
        ]
      }
    ]
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

      return makeItem({
        rank,
        name,
        ticker,
        country,
        amount,
        usdValue: "-",
        share: meta?.replace(/\[|\]/g, "") || undefined
      });
    })
    .filter(isTreasuryItem)
    .slice(0, 25);

  return rows.length ? rows : null;
}

function parseBtcEtfs(html: string) {
  const rows = tableRows(html)
    .map((cells) => {
      const [rank, country, rawName, amount, usdValue, share] = cells;
      if (!rank || !rawName || !amount) return null;
      const { name, ticker } = splitTrailingTicker(rawName);

      return makeItem({ rank, name, ticker, country, amount, usdValue, share });
    })
    .filter(isTreasuryItem)
    .slice(0, 25);

  return rows.length ? rows : null;
}

function parseBtcGovernments(html: string) {
  const rows = tableRows(html)
    .map((cells) => {
      const [rank, country, name, amount, usdValue, share] = cells;
      if (!rank || !name || !amount) return null;

      return makeItem({ rank, name, country, amount, usdValue, share });
    })
    .filter(isTreasuryItem)
    .slice(0, 20);

  return rows.length ? rows : null;
}

function parseEthCompanies(html: string) {
  const rows = tableRows(html)
    .map((cells) => {
      const [rank, country, rawName, amount, usdValue] = cells;
      if (!rank || !rawName || !amount) return null;
      const { name, ticker } = splitTrailingTicker(rawName);

      return makeItem({ rank, name, ticker, country, amount, usdValue });
    })
    .filter(isTreasuryItem)
    .slice(0, 25);

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

function makeItem({
  rank,
  name,
  ticker,
  country,
  amount,
  usdValue,
  share,
  note
}: {
  rank: string;
  name: string;
  ticker?: string;
  country?: string;
  amount: string;
  usdValue?: string;
  share?: string;
  note?: string;
}): TreasuryItem {
  return {
    rank: Number(rank.replace(/\D/g, "")) || 0,
    name,
    ticker: ticker || undefined,
    country: country || undefined,
    amount,
    amountValue: parseAmount(amount),
    usdValue: usdValue || "-",
    share: share || undefined,
    note
  };
}

function parseAmount(value: string) {
  const parsed = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isTreasuryItem(value: TreasuryItem | null): value is TreasuryItem {
  return Boolean(value);
}

const fallbackBtcEtfs: TreasuryItem[] = [
  makeItem({ rank: "1", country: "US", name: "iShares Bitcoin Trust", ticker: "IBIT", amount: "811,291", usdValue: "$51,831M", share: "3.863%" }),
  makeItem({ rank: "2", country: "US", name: "Fidelity Wise Origin Bitcoin Fund", ticker: "FBTC", amount: "185,798", usdValue: "$11,870M", share: "0.885%" }),
  makeItem({ rank: "3", country: "US", name: "Grayscale Bitcoin Trust", ticker: "GBTC", amount: "150,744", usdValue: "$9,630M", share: "0.718%" }),
  makeItem({ rank: "4", country: "US", name: "Grayscale Bitcoin Mini Trust", ticker: "BTC", amount: "53,002", usdValue: "$3,386M", share: "0.252%" }),
  makeItem({ rank: "5", country: "US", name: "Bitwise Bitcoin ETF", ticker: "BITB", amount: "38,501", usdValue: "$2,472M", share: "0.183%" })
];

const fallbackBtcCompanies: TreasuryItem[] = [
  makeItem({ rank: "1", country: "US", name: "Strategy", ticker: "MSTR", amount: "846,842", usdValue: "-", share: "0.80" }),
  makeItem({ rank: "2", country: "US", name: "Twenty One Capital", ticker: "XXI", amount: "43,514", usdValue: "-", share: "1.35" }),
  makeItem({ rank: "3", country: "JP", name: "Metaplanet Inc.", ticker: "MPJPY", amount: "40,177", usdValue: "-", share: "0.82" }),
  makeItem({ rank: "4", country: "US", name: "MARA Holdings, Inc.", ticker: "MARA", amount: "36,303", usdValue: "-", share: "2.93" }),
  makeItem({ rank: "5", country: "US", name: "Bitcoin Standard Treasury Company", ticker: "BSTR", amount: "30,021", usdValue: "-" })
];

const fallbackBtcGovernments: TreasuryItem[] = [
  makeItem({ rank: "1", country: "US", name: "United States", amount: "328,372", usdValue: "$20,978M", share: "1.564%" }),
  makeItem({ rank: "2", country: "CN", name: "China", amount: "190,000", usdValue: "$12,138M", share: "0.905%" }),
  makeItem({ rank: "3", country: "GB", name: "United Kingdom", amount: "61,245", usdValue: "$3,913M", share: "0.292%" }),
  makeItem({ rank: "4", country: "UA", name: "Ukraine (holdings of public officials)", amount: "46,351", usdValue: "$2,961M", share: "0.221%" }),
  makeItem({ rank: "5", country: "SV", name: "El Salvador", amount: "7,689", usdValue: "$491M", share: "0.037%" })
];

const fallbackEthCompanies: TreasuryItem[] = [
  makeItem({ rank: "1", country: "US", name: "BitMine Immersion Technologies, Inc.", amount: "5,543,872", usdValue: "$9.51B" }),
  makeItem({ rank: "2", country: "IL", name: "Sharplink, Inc.", amount: "863,424", usdValue: "$1.48B" }),
  makeItem({ rank: "3", country: "US", name: "The Ether Machine", amount: "495,362", usdValue: "$849.82M" }),
  makeItem({ rank: "4", country: "US", name: "Bit Digital, Inc.", ticker: "BTBT", amount: "155,239", usdValue: "$266.32M" }),
  makeItem({ rank: "5", country: "US", name: "ETHZilla Corp", amount: "94,030", usdValue: "$161.31M" })
];

const ethEtfs: TreasuryItem[] = [
  makeItem({ rank: "1", country: "US", name: "iShares Ethereum Trust ETF", ticker: "ETHA", amount: "Spot ETH", usdValue: "BlackRock" }),
  makeItem({ rank: "2", country: "US", name: "Grayscale Ethereum Trust", ticker: "ETHE", amount: "Spot ETH", usdValue: "Grayscale" }),
  makeItem({ rank: "3", country: "US", name: "Fidelity Ethereum Fund", ticker: "FETH", amount: "Spot ETH", usdValue: "Fidelity" }),
  makeItem({ rank: "4", country: "US", name: "Bitwise Ethereum ETF", ticker: "ETHW", amount: "Spot ETH", usdValue: "Bitwise" }),
  makeItem({ rank: "5", country: "US", name: "VanEck Ethereum ETF", ticker: "ETHV", amount: "Spot ETH", usdValue: "VanEck" }),
  makeItem({ rank: "6", country: "US", name: "Franklin Ethereum ETF", ticker: "EZET", amount: "Spot ETH", usdValue: "Franklin" }),
  makeItem({ rank: "7", country: "US", name: "21Shares Core Ethereum ETF", ticker: "CETH", amount: "Spot ETH", usdValue: "21Shares" }),
  makeItem({ rank: "8", country: "US", name: "Invesco Galaxy Ethereum ETF", ticker: "QETH", amount: "Spot ETH", usdValue: "Invesco Galaxy" })
];

const ethGovernments: TreasuryItem[] = [
  {
    rank: 1,
    name: "Aucune reserve ETH gouvernementale consolidee",
    amount: "-",
    usdValue: "-",
    note: "La page est prete pour brancher les pays si une source publique fiable publie des soldes ETH."
  }
];
