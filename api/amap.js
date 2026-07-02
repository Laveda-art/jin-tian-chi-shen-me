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
    params: ["keywords", "location", "radius", "types", "offset", "page", "extensions"],
  },
  ip: {
    path: "/ip",
    params: [],
  },
};

function getAmapKey() {
  return process.env.AMAP_KEY || process.env.AMAP_WEB_SERVICE_KEY || "";
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function getFirstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function buildAmapUrl(actionConfig, query, key) {
  const url = new URL(`${AMAP_API_BASE}${actionConfig.path}`);
  url.searchParams.set("key", key);
  url.searchParams.set("output", "json");

  actionConfig.params.forEach((name) => {
    const value = getFirstQueryValue(query[name]);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      url.searchParams.set(name, String(value).trim());
    }
  });

  return url;
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    sendJson(response, 405, { error: "只支持 GET 请求" });
    return;
  }

  const key = getAmapKey();
  if (!key) {
    sendJson(response, 500, { error: "服务端缺少 AMAP_KEY 环境变量" });
    return;
  }

  const action = getFirstQueryValue(request.query.action);
  const actionConfig = ACTIONS[action];
  if (!actionConfig) {
    sendJson(response, 400, { error: "未知的高德代理请求" });
    return;
  }

  try {
    const amapResponse = await fetch(buildAmapUrl(actionConfig, request.query, key));
    const payload = await amapResponse.json();

    if (!amapResponse.ok || payload.status === "0") {
      sendJson(response, 502, {
        error: payload.info || "高德接口请求失败",
        infocode: payload.infocode,
      });
      return;
    }

    sendJson(response, 200, payload);
  } catch (error) {
    sendJson(response, 502, { error: error.message || "高德接口请求失败" });
  }
};
