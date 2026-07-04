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
        const url = getAmapUrl(action, pageParams, amapKey);

        const result = await fetch(url);
        const data = await result.json();

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

    const url = getAmapUrl(action, params, amapKey);
    const result = await fetch(url);
    const data = await result.json();
    response.status(200).json(data);
  } catch (error) {
    response.status(500).json({ status: "0", info: error.message || "Proxy request failed" });
  }
};
