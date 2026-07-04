const AMAP_API_BASE = "https://restapi.amap.com/v3";

const ACTIONS = {
  geocode: {
    path: "/geocode/geo",
    params: ["address", "city"],
  },
  regeo: {
    path: "/geocode/regeo",
    params: ["location"],
  },
  tips: {
    path: "/assistant/inputtips",
    params: ["keywords", "city", "type"],
  },
  around: {
    path: "/place/around",
    params: ["keywords", "location", "radius", "types", "offset", "page", "extensions", "pages"],
  },
  ip: {
    path: "/ip",
    params: [],
  },
};

function getAmapUrl(action, params, amapKey) {
  const config = ACTIONS[action];
  if (!config) throw new Error(`Unknown action: ${action}`);

  const url = new URL(config.path, AMAP_API_BASE);
  const searchParams = new URLSearchParams();

  searchParams.set("key", amapKey);

  config.params.forEach((key) => {
    if (key === "pages") return;
    if (params[key] !== undefined && params[key] !== null) {
      searchParams.set(key, params[key]);
    }
  });

  url.search = searchParams.toString();
  return url.toString();
}

const CACHE_DURATION = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;
const RETRY_DELAYS = [400, 900, 1600];
const RETRYABLE_ERRORS = [
  "SERVICE_NOT_AVAILABLE",
  "NOT_AVAILABLE",
  "CUQPS_HAS_EXCEEDED_THE_LIMIT",
  "QPS_HAS_EXCEEDED_THE_LIMIT",
  "OVER_QUOTA",
];
const serverCache = new Map();

function getCacheKey(action, params) {
  const query = Object.keys(params)
    .filter((key) => key !== "pages")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return `${action}?${query}`;
}

function getCached(cacheKey) {
  const item = serverCache.get(cacheKey);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_DURATION) {
    serverCache.delete(cacheKey);
    return null;
  }
  return item.data;
}

function setCached(cacheKey, data) {
  if (data?.status === "1") {
    serverCache.set(cacheKey, { timestamp: Date.now(), data });
  }
}

function isRetryableAmapError(data) {
  const message = `${data?.info || ""} ${data?.infocode || ""}`;
  return data?.status === "0" && RETRYABLE_ERRORS.some((error) => message.includes(error));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAmapJson(url) {
  let lastError = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const result = await fetch(url, { signal: controller.signal });
      const data = await result.json();
      if (!isRetryableAmapError(data) || attempt === RETRY_DELAYS.length) return data;
      lastError = new Error(data.info || "Amap retryable error");
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_DELAYS.length) throw error;
    } finally {
      clearTimeout(timer);
    }
    await wait(RETRY_DELAYS[attempt]);
  }
  throw lastError || new Error("Amap request failed");
}

async function requestAmap(action, params, amapKey) {
  const cacheKey = getCacheKey(action, params);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = getAmapUrl(action, params, amapKey);
  const data = await fetchAmapJson(url);
  setCached(cacheKey, data);
  return data;
}

module.exports = async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (request.method === "OPTIONS") {
    response.status(200).end();
    return;
  }

  const { action, ...params } = request.query;

  if (!action || !ACTIONS[action]) {
    response.status(400).json({ status: "0", info: "Invalid action" });
    return;
  }

  const amapKey = process.env.AMAP_KEY;
  if (!amapKey) {
    response.status(500).json({ status: "0", info: "AMAP_KEY not configured" });
    return;
  }

  try {
    if (action === "around" && params.pages) {
      const pages = parseInt(params.pages, 10) || 1;
      const allPois = [];

      for (let page = 1; page <= pages; page++) {
        const pageParams = { ...params, page: String(page) };
        const data = await requestAmap(action, pageParams, amapKey);

        if (data.status === "1" && data.pois) {
          allPois.push(...data.pois);
          if (data.pois.length < (parseInt(params.offset, 10) || 25)) {
            break;
          }
        } else {
          response.status(200).json(data);
          return;
        }

        if (page < pages) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      response.status(200).json({
        status: "1",
        info: "OK",
        infocode: "10000",
        count: String(allPois.length),
        pois: allPois,
      });
      return;
    }

    const data = await requestAmap(action, params, amapKey);
    response.status(200).json(data);
  } catch (error) {
    response.status(500).json({ status: "0", info: error.message || "Proxy request failed" });
  }
};
