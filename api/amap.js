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
    // pages 是内部参数，表示要搜索多少页，内部串行请求
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
    if (key === "pages") return; // 内部参数，不传给高德
    if (params[key] !== undefined && params[key] !== null) {
      searchParams.set(key, params[key]);
    }
  });

  url.search = searchParams.toString();
  return url.toString();
}

export default async function handler(request, response) {
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
    // 如果是 around 请求且带 pages 参数，内部串行请求多页
    if (action === "around" && params.pages) {
      const pages = parseInt(params.pages, 10) || 1;
      const allPois = [];

      for (let page = 1; page <= pages; page++) {
        const pageParams = { ...params, page: String(page) };
        const url = getAmapUrl(action, pageParams);

        const result = await fetch(url);
        const data = await result.json();

        if (data.status === "1" && data.pois) {
          allPois.push(...data.pois);
          // 如果这页结果不足一页，说明后面没有更多结果了
          if (data.pois.length < (parseInt(params.offset, 10) || 25)) {
            break;
          }
        } else {
          // 如果某页出错，返回错误
          response.status(200).json(data);
          return;
        }

        // 每页之间延迟 100ms，避免触发 QPS 限制
        if (page < pages) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // 返回合并后的结果
      response.status(200).json({
        status: "1",
        info: "OK",
        infocode: "10000",
        count: String(allPois.length),
        pois: allPois,
      });
      return;
    }

    // 普通单页请求
    const url = getAmapUrl(action, params);
    const result = await fetch(url);
    const data = await result.json();
    response.status(200).json(data);
  } catch (error) {
    response.status(500).json({ status: "0", info: error.message || "Proxy request failed" });
  }
}
