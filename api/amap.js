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

function getAmapUrl(action, params) {
  const config = ACTIONS[action];
  if (!config) throw new Error(`Unknown action: ${action}`);

  const url = new URL(config.path, AMAP_API_BASE);
  const searchParams = new URLSearchParams();

  searchParams.set("key", process.env.AMAP_KEY);

  config.params.forEach((key) => {
    if (key === "pages") return;
    if (params[key] !== undefined && params[key] !== null) {
      searchParams.set(key, params[key]);
    }
  });

  url.search = searchParams.toString();
  return url.toString();
}

// 服务端内存缓存：5分钟
const serverCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

function getCacheKey(action, params) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return `${action}?${sorted}`;
}

function getCached(key) {
  const item = serverCache.get(key);
  if (item && Date.now() - item.time < CACHE_DURATION) return item.data;
  serverCache.delete(key);
  return null;
}

function setCache(key, data) {
  serverCache.set(key, { time: Date.now(), data });
}

const RETRY_ERRORS = ['CUQPS_HAS_EXCEEDED_THE_LIMIT', 'QPS_HAS_EXCEEDED_THE_LIMIT', 'OVER_QUOTA', 'SERVICE_NOT_AVAILABLE'];

async function fetchWithRetry(url, maxRetries = 5) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await fetch(url);
    const data = await result.json();

    if (data.status === '0' && RETRY_ERRORS.some(e => (data.info || '').includes(e))) {
      if (attempt < maxRetries) {
        const delay = 2000 + Math.random() * 3000; // 2-5秒随机延迟
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }
    return data;
  }
  return { status: '0', info: 'QPS limit exceeded after retries' };
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

  if (!process.env.AMAP_KEY) {
    response.status(500).json({ status: "0", info: "AMAP_KEY not configured" });
    return;
  }

  try {
    if (action === "around" && params.pages) {
      const pages = parseInt(params.pages, 10) || 1;
      const allPois = [];

      for (let page = 1; page <= pages; page++) {
        const pageParams = { ...params, page: String(page) };
        const cacheKey = getCacheKey(action, pageParams);

        let data = getCached(cacheKey);
        if (!data) {
          const url = getAmapUrl(action, pageParams);
          data = await fetchWithRetry(url);
          if (data.status === '1') setCache(cacheKey, data);
        }

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
          await new Promise(resolve => setTimeout(resolve, 500));
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

    const cacheKey = getCacheKey(action, params);
    let data = getCached(cacheKey);
    if (!data) {
      const url = getAmapUrl(action, params);
      data = await fetchWithRetry(url);
      if (data.status === '1') setCache(cacheKey, data);
    }
    response.status(200).json(data);
  } catch (error) {
    response.status(500).json({ status: "0", info: error.message || "Proxy request failed" });
  }
};
