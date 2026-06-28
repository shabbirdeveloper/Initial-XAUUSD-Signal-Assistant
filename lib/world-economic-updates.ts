export const GDELT_DOCS_URL = "https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/";
export const BBC_BUSINESS_URL = "https://www.bbc.com/news/business";
export const BBC_BUSINESS_RSS_URL = "https://feeds.bbci.co.uk/news/business/rss.xml";
export const GOOGLE_ECONOMIC_NEWS_RSS_URL =
  "https://news.google.com/rss/search?q=world%20economy%20OR%20inflation%20OR%20interest%20rates%20OR%20Federal%20Reserve%20OR%20gold%20prices%20OR%20dollar%20when%3A1d&hl=en-US&gl=US&ceid=US%3Aen";

const WORLD_ECONOMIC_CACHE_TTL_MS = 30 * 60 * 1000;
const WORLD_ECONOMIC_QUERY =
  '("global economy" OR economy OR economic OR inflation OR "interest rates" OR "central bank" OR "Federal Reserve" OR recession OR GDP OR "bond yields" OR "oil prices" OR "gold prices" OR stocks OR Nasdaq OR dollar OR trade OR tariff OR finance) sourcelang:english';
const ECONOMIC_RELEVANCE_TERMS = [
  "bank",
  "bond",
  "central bank",
  "cme",
  "commodity",
  "dollar",
  "econom",
  "fed",
  "federal reserve",
  "financ",
  "gdp",
  "gold",
  "inflation",
  "interest",
  "jobless",
  "market",
  "nasdaq",
  "oil",
  "rate",
  "recession",
  "retail sales",
  "stocks",
  "tariff",
  "trade",
  "unemployment",
  "yield"
];
const NON_ECONOMIC_TITLE_TERMS = ["advert", "football", "shirt", "soccer", "world cup"];

interface RawGdeltArticle {
  url?: unknown;
  title?: unknown;
  seendate?: unknown;
  domain?: unknown;
  language?: unknown;
  sourcecountry?: unknown;
  socialimage?: unknown;
}

interface RawGdeltResponse {
  articles?: RawGdeltArticle[];
}

export interface WorldEconomicHeadline {
  title: string;
  url: string;
  domain: string;
  sourceCountry: string;
  language: string;
  seenAt: string;
  imageUrl: string;
}

export interface WorldEconomicUpdatesResult {
  headlines: WorldEconomicHeadline[];
  fetchedAt: string;
  sourceName: string;
  sourceUrl: string;
  docsUrl: string;
  warning?: string;
}

let cachedUpdates: { cacheKey: string; expiresAt: number; data: WorldEconomicUpdatesResult } | null = null;

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanTitle(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function parseGdeltDate(value: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);

  if (!match) {
    return "";
  }

  const [, year, month, day, hour, minute, second] = match;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
}

function buildSourceUrl() {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", WORLD_ECONOMIC_QUERY);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", "24");
  url.searchParams.set("timespan", "24h");
  url.searchParams.set("sort", "datedesc");
  return url.toString();
}

function canonicalHeadlineUrl(value: string) {
  try {
    const url = new URL(value);
    url.protocol = "https:";
    url.hostname = url.hostname.replace(/^www\./, "");
    url.port = "";
    url.hash = "";

    return `${url.hostname}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  }
}

function decodeXmlText(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function readTag(item: string, tag: string) {
  const match = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXmlText(match[1]) : "";
}

function normalizeRssItem(item: string): WorldEconomicHeadline | null {
  const title = cleanTitle(readTag(item, "title"));
  const url = readTag(item, "link");
  const pubDate = readTag(item, "pubDate");
  const timestamp = new Date(pubDate).getTime();

  if (!title || !url || Number.isNaN(timestamp)) {
    return null;
  }

  return {
    title,
    url,
    domain: new URL(url).hostname.replace(/^www\./, ""),
    sourceCountry: "United Kingdom",
    language: "English",
    seenAt: new Date(timestamp).toISOString(),
    imageUrl: ""
  };
}

function normalizeArticle(article: RawGdeltArticle): WorldEconomicHeadline | null {
  const title = cleanTitle(asText(article.title));
  const url = asText(article.url);
  const seenAt = parseGdeltDate(asText(article.seendate));

  if (!title || !url || !seenAt) {
    return null;
  }

  return {
    title,
    url,
    domain: asText(article.domain) || new URL(url).hostname,
    sourceCountry: asText(article.sourcecountry) || "Global",
    language: asText(article.language) || "English",
    seenAt,
    imageUrl: asText(article.socialimage)
  };
}

function uniqueByUrlAndTitle(headlines: WorldEconomicHeadline[]) {
  const seen = new Set<string>();
  const seenTitles = new Set<string>();

  return headlines.filter((headline) => {
    const titleKey = headline.title.toLowerCase();
    const key = `${canonicalHeadlineUrl(headline.url)}|${titleKey}`;

    if (seen.has(key) || seenTitles.has(titleKey)) {
      return false;
    }

    seen.add(key);
    seenTitles.add(titleKey);
    return true;
  });
}

function sortByNewest(headlines: WorldEconomicHeadline[]) {
  return [...headlines].sort((left, right) => {
    return new Date(right.seenAt).getTime() - new Date(left.seenAt).getTime();
  });
}

function isEconomyRelevantHeadline(headline: WorldEconomicHeadline) {
  const haystack = `${headline.title} ${headline.domain}`.toLowerCase();
  const hasBlockedTerm = NON_ECONOMIC_TITLE_TERMS.some((term) => haystack.includes(term));

  if (hasBlockedTerm) {
    return false;
  }

  return ECONOMIC_RELEVANCE_TERMS.some((term) => haystack.includes(term));
}

async function fetchGdeltHeadlines(sourceUrl: string) {
  const response = await fetch(sourceUrl, {
    headers: {
      accept: "application/json"
    },
    next: { revalidate: 30 * 60 }
  });

  if (!response.ok) {
    throw new Error(`World economic update feed returned ${response.status}.`);
  }

  const payload = (await response.json()) as RawGdeltResponse;

  return uniqueByUrlAndTitle(
    (payload.articles ?? [])
      .map(normalizeArticle)
      .filter((headline): headline is WorldEconomicHeadline => Boolean(headline))
  );
}

async function fetchRssHeadlines(feedUrl: string, sourceCountry = "Global") {
  const response = await fetch(feedUrl, {
    headers: {
      accept: "application/rss+xml, application/xml, text/xml"
    },
    next: { revalidate: 30 * 60 }
  });

  if (!response.ok) {
    throw new Error(`RSS feed returned ${response.status}.`);
  }

  const xml = await response.text();
  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map((match) => match[1]);

  return uniqueByUrlAndTitle(
    items
      .map((item) => normalizeRssItem(item))
      .filter((headline): headline is WorldEconomicHeadline => Boolean(headline))
      .map((headline) => ({ ...headline, sourceCountry }))
  );
}

async function fetchBbcBusinessHeadlines() {
  return fetchRssHeadlines(BBC_BUSINESS_RSS_URL, "United Kingdom");
}

async function fetchGoogleEconomicHeadlines() {
  return fetchRssHeadlines(GOOGLE_ECONOMIC_NEWS_RSS_URL, "Global");
}

export async function getWorldEconomicUpdates(): Promise<WorldEconomicUpdatesResult> {
  const now = Date.now();
  const sourceUrl = buildSourceUrl();
  const cacheKey = `${sourceUrl}|${GOOGLE_ECONOMIC_NEWS_RSS_URL}|${BBC_BUSINESS_RSS_URL}`;

  if (cachedUpdates && cachedUpdates.cacheKey === cacheKey && cachedUpdates.expiresAt > now) {
    return cachedUpdates.data;
  }

  try {
    const [gdeltResult, googleResult, bbcResult] = await Promise.allSettled([
      fetchGdeltHeadlines(sourceUrl),
      fetchGoogleEconomicHeadlines(),
      fetchBbcBusinessHeadlines()
    ]);

    const gdeltHeadlines = gdeltResult.status === "fulfilled" ? gdeltResult.value : [];
    const googleHeadlines = googleResult.status === "fulfilled" ? googleResult.value : [];
    const bbcHeadlines = bbcResult.status === "fulfilled" ? bbcResult.value : [];
    const combinedHeadlines = sortByNewest(uniqueByUrlAndTitle([...gdeltHeadlines, ...googleHeadlines, ...bbcHeadlines]));
    const relevantHeadlines = combinedHeadlines.filter(isEconomyRelevantHeadline);
    const headlines = (relevantHeadlines.length >= 4 ? relevantHeadlines : combinedHeadlines).slice(0, 6);

    if (headlines.length === 0) {
      const gdeltError = gdeltResult.status === "rejected" ? gdeltResult.reason : "No GDELT headlines returned.";
      const googleError = googleResult.status === "rejected" ? googleResult.reason : "No Google News headlines returned.";
      const bbcError = bbcResult.status === "rejected" ? bbcResult.reason : "No BBC headlines returned.";

      throw new Error(
        `${gdeltError instanceof Error ? gdeltError.message : String(gdeltError)} ${
          googleError instanceof Error ? googleError.message : String(googleError)
        } ${
          bbcError instanceof Error ? bbcError.message : String(bbcError)
        }`
      );
    }

    const data = {
      headlines,
      fetchedAt: new Date().toISOString(),
      sourceName: "GDELT + Google News + BBC Business",
      sourceUrl,
      docsUrl: GDELT_DOCS_URL
    };

    cachedUpdates = {
      cacheKey,
      expiresAt: now + WORLD_ECONOMIC_CACHE_TTL_MS,
      data
    };

    return data;
  } catch (error) {
    try {
      const headlines = (await fetchBbcBusinessHeadlines()).slice(0, 6);
      const data = {
        headlines,
        fetchedAt: new Date().toISOString(),
        sourceName: "BBC Business",
        sourceUrl: BBC_BUSINESS_URL,
        docsUrl: BBC_BUSINESS_RSS_URL
      };

      cachedUpdates = {
        cacheKey,
        expiresAt: now + WORLD_ECONOMIC_CACHE_TTL_MS,
        data
      };

      return data;
    } catch (fallbackError) {
      const primaryError = error instanceof Error ? error.message : "Unable to load world economic updates.";
      const secondaryError = fallbackError instanceof Error ? fallbackError.message : "Fallback feed unavailable.";

      return {
        headlines: [],
        fetchedAt: new Date().toISOString(),
        sourceName: "GDELT + BBC Business",
        sourceUrl,
        docsUrl: GDELT_DOCS_URL,
        warning: `${primaryError} ${secondaryError}`
      };
    }
  }
}
