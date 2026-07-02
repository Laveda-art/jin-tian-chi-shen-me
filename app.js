const CONFIG = window.EAT_APP_CONFIG || {};
const AMAP_PROXY_PATH = CONFIG.AMAP_PROXY_PATH || "/api/amap";
const SEARCH_RADIUS = 500;
const MAX_RESULTS_PER_CATEGORY = 50;
const SEARCH_PAGE_SIZE = 25;
const SEARCH_PAGES = 2;  // 2页
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

const AMAP_RESTAURANT_TYPES = "050000";
const AMAP_DESSERT_TYPES = "050100|050200|050300|050400|050500|050600|050700|050800|050900";

const DESSERT_BRAND_KEYWORDS = [
  "瑞幸", "瑞幸咖啡", "luckin", "蜜雪", "蜜雪冰城", "星巴克", "starbucks",
  "manner", "seesaw", "库迪", "cotti", "幸运咖", "挪瓦", "nowwa",
  "喜茶", "奈雪", "霸王茶姬", "茶百道", "古茗", "沪上阿姨", "一点点",
  "书亦烧仙草", "益禾堂", "柠季",
];

const CATEGORIES = [
  {
    id: "restaurants",
    label: "餐厅",
    title: "附近餐厅",
    types: AMAP_RESTAURANT_TYPES,
    emptyTitle: "没搜到餐厅",
    emptyMessage: "换一个更具体的地址试试，比如商场、地铁站或门牌号。",
  },
  {
    id: "dessert",
    label: "甜品下午茶",
    title: "甜品下午茶",
    types: AMAP_DESSERT_TYPES,
    emptyTitle: "没搜到甜品下午茶",
    emptyMessage: "附近可能甜品店不多，可以换个商圈、商场或地铁站试试。",
  },
];

const DESSERT_KEYWORDS = [
  "甜品", "甜点", "下午茶", "咖啡", "coffee", "café", "cafe", "咖啡厅", "咖啡馆",
  "奶茶", "茶饮", "饮品", "果汁", "果茶", ...DESSERT_BRAND_KEYWORDS,
  "蛋糕", "面包", "吐司", "贝果", "可颂", "烘焙", "糕", "糕点", "糕饼", "西点",
  "冰淇淋", "冰激凌", "雪糕", "豆花", "双皮奶", "酒酿", "糖水", "轻食", "brunch", "早午餐",
];

const NON_FOOD_KEYWORDS = [
  "个人用品", "服装", "购物", "零售", "便利店", "超市", "药房", "美容", "美发",
  "培训", "学校", "工作室", "studio", "烹饪教室", "厨艺", "家居", "家具", "数码",
  "电子", "电器", "眼镜", "珠宝", "银行", "公寓", "停车场", "地铁", "公交", "景点",
  "售楼", "地产", "房产", "写字楼", "办公",
];

const RESTAURANT_EXCLUDE_KEYWORDS = [
  ...DESSERT_KEYWORDS, ...NON_FOOD_KEYWORDS, ...DESSERT_BRAND_KEYWORDS, "blue bottle",
];

const RESTAURANT_INCLUDE_KEYWORDS = [
  "餐厅", "饭店", "饭", "菜", "面", "粉", "粥", "饺", "包子", "火锅", "烧烤", "串",
  "小吃", "快餐", "料理", "寿司", "拉面", "汉堡", "披萨", "牛排", "食堂", "酒楼",
];

const demoResults = {
  restaurants: [
    { id: "demo-1", name: "巷口牛肉面", type: "中式快餐", address: "演示地址 18 号", distance: 128, rating: "4.6", cost: "35", location: "121.473667,31.230525", photo: "" },
    { id: "demo-2", name: "暖锅小馆", type: "火锅", address: "演示路 66 号 2 楼", distance: 246, rating: "4.8", cost: "88", location: "121.475667,31.232525", photo: "" },
    { id: "demo-3", name: "日式便当研究所", type: "日本料理", address: "演示街区 B1-12", distance: 372, rating: "4.4", cost: "49", location: "121.471667,31.229525", photo: "" },
  ],
  dessert: [
    { id: "demo-dessert-1", name: "栗子蛋糕研究社", type: "甜品店", address: "演示广场 1 层", distance: 156, rating: "4.7", cost: "42", location: "121.472667,31.231125", photo: "" },
    { id: "demo-dessert-2", name: "午后三点咖啡", type: "咖啡厅", address: "演示路 29 号", distance: 288, rating: "4.5", cost: "38", location: "121.474667,31.230025", photo: "" },
    { id: "demo-dessert-3", name: "奶油泡芙窗口", type: "糕饼店", address: "演示街区 B1-07", distance: 431, rating: "4.4", cost: "31", location: "121.470167,31.231725", photo: "" },
  ],
};

const els = {
  addressInput: document.querySelector("#addressInput"),
  locationSuggestions: document.querySelector("#locationSuggestions"),
  locationButton: document.querySelector("#locationButton"),
  searchButton: document.querySelector("#searchButton"),
  searchHint: document.querySelector("#searchHint"),
  randomButton: document.querySelector("#randomButton"),
  pickAgainButton: document.querySelector("#pickAgainButton"),
  resultCount: document.querySelector("#resultCount"),
  resultTitle: document.querySelector("#resultTitle"),
  statePanel: document.querySelector("#statePanel"),
  restaurantList: document.querySelector("#restaurantList"),
  pickedPanel: document.querySelector("#pickedPanel"),
  drawingStage: document.querySelector("#drawingStage"),
  pickedContent: document.querySelector("#pickedContent"),
  pickedPhoto: document.querySelector("#pickedPhoto"),
  closePickedButton: document.querySelector("#closePickedButton"),
  drawingName: document.querySelector("#drawingName"),
  drawingCategory: document.querySelector("#drawingCategory"),
  fortuneNumber: document.querySelector("#fortuneNumber"),
  pickedName: document.querySelector("#pickedName"),
  pickedMeta: document.querySelector("#pickedMeta"),
  navigateLink: document.querySelector("#navigateLink"),
  clearButton: document.querySelector("#clearButton"),
  tabButtons: document.querySelectorAll(".tab-button"),
};

let activeCategoryId = "restaurants";
let resultsByCategory = { restaurants: [], dessert: [] };
let selectedByCategory = { restaurants: null, dessert: null };
let isShowingDemo = false;
let suggestionTimer = null;
let selectedLocation = null;
let isApplyingAddress = false;
let isPicking = false;
let preloadTimer = null;
let lastSearchTime = 0;
const SEARCH_COOLDOWN = 3000;

function getActiveCategory() {
  return CATEGORIES.find((category) => category.id === activeCategoryId) || CATEGORIES[0];
}

function updateClearButton() {
  els.clearButton.classList.toggle("visible", els.addressInput.value.length > 0);
}

function setBusy(isBusy) {
  els.searchButton.disabled = isBusy;
  els.searchButton.textContent = isBusy ? "搜索中" : "搜索";
}

function setState(title, message, tone = "normal") {
  els.statePanel.classList.remove("hidden");
  els.statePanel.replaceChildren();
  const titleEl = document.createElement("strong");
  titleEl.textContent = title;
  const messageEl = document.createElement("span");
  messageEl.textContent = message;
  els.statePanel.append(titleEl, messageEl);
  els.statePanel.dataset.tone = tone;
}

function hideState() {
  els.statePanel.classList.add("hidden");
}

function getHasAmapProxy() {
  return Boolean(AMAP_PROXY_PATH) && window.location.protocol !== "file:";
}

// ========== 缓存系统 ==========
function getCacheKey(address) {
  return `eat_${address.trim().toLowerCase()}`;
}

function getCachedResult(address) {
  try {
    const key = getCacheKey(address);
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const data = JSON.parse(cached);
    if (Date.now() - data.timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data.results;
  } catch {
    return null;
  }
}

function setCachedResult(address, results) {
  try {
    const key = getCacheKey(address);
    localStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      results,
    }));
  } catch {
    // 缓存失败不阻塞
  }
}

// ========== API 请求 ==========
async function requestAmap(action, params = {}) {
  const url = new URL(AMAP_PROXY_PATH, window.location.origin);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      url.searchParams.set(key, String(value).trim());
    }
  });
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status === "0") {
    throw new Error(payload.error || payload.info || "高德接口请求失败");
  }
  return payload;
}

function stringifyCenter(center) {
  if (Array.isArray(center)) return center.join(",");
  return String(center || "");
}

async function geocodeAddress(address) {
  const result = await requestAmap("geocode", { address });
  const location = result?.geocodes?.[0]?.location;
  if (!location) throw new Error("没有找到这个地址");
  return normalizeLocation(location);
}

async function reverseGeocode(center) {
  const result = await requestAmap("regeo", { location: stringifyCenter(center) });
  return result?.regeocode?.formatted_address || "当前位置";
}

// ========== 搜索逻辑（新版：只发1个请求，带pages参数） ==========
async function searchCategory(center, category) {
  const result = await requestAmap("around", {
    keywords: "",
    location: stringifyCenter(center),
    radius: SEARCH_RADIUS,
    types: category.types,
    offset: SEARCH_PAGE_SIZE,
    pages: SEARCH_PAGES,  // 告诉后端要搜几页
    extensions: "all",
  });

  const collected = (result?.pois || []).map((poi) => normalizePoi(poi, ""));
  return getSortedLimitedResults(filterByCategory(dedupeRestaurants(collected), category.id));
}

function dedupeRestaurants(list) {
  const seen = new Set();
  return list.filter((restaurant) => {
    const key = restaurant.id || `${restaurant.name}-${restaurant.address}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getSortedLimitedResults(list) {
  return list.sort((a, b) => a.distance - b.distance).slice(0, MAX_RESULTS_PER_CATEGORY);
}

function getDessertFallback(restaurants) {
  return restaurants.filter(isDessertPlace);
}

function filterByCategory(list, categoryId) {
  const foodList = list.filter(isFoodRelatedPlace);
  if (categoryId === "dessert") return foodList.filter(isDessertPlace);
  return foodList.filter(isRestaurantPlace);
}

function getSearchText(restaurant) {
  return `${restaurant.name} ${restaurant.type} ${restaurant.address} ${restaurant.sourceQuery || ""}`.toLowerCase();
}

function getFilterText(restaurant) {
  return `${restaurant.name} ${restaurant.type} ${restaurant.sourceQuery || ""}`.toLowerCase();
}

function hasAnyKeyword(text, keywords) {
  return keywords.some((keyword) => keyword && text.includes(keyword.toLowerCase()));
}

function isDessertPlace(restaurant) {
  const text = getFilterText(restaurant);
  if (hasAnyKeyword(text, NON_FOOD_KEYWORDS)) return false;
  return hasAnyKeyword(text, DESSERT_KEYWORDS) || hasAnyKeyword(restaurant.sourceQuery || "", DESSERT_KEYWORDS);
}

function isRestaurantPlace(restaurant) {
  const text = getFilterText(restaurant);
  if (hasAnyKeyword(text, RESTAURANT_EXCLUDE_KEYWORDS)) return false;
  return hasAnyKeyword(text, RESTAURANT_INCLUDE_KEYWORDS);
}

function isFoodRelatedPlace(restaurant) {
  const text = getFilterText(restaurant);
  if (hasAnyKeyword(text, NON_FOOD_KEYWORDS)) return false;
  return hasAnyKeyword(text, [...RESTAURANT_INCLUDE_KEYWORDS, ...DESSERT_KEYWORDS]);
}

function normalizePoi(poi, sourceQuery = "") {
  const location = typeof poi.location === "string" ? poi.location : poi.location ? `${poi.location.lng ?? poi.location.getLng?.()},${poi.location.lat ?? poi.location.getLat?.()}` : "";
  return {
    id: poi.id || `${poi.name}-${poi.address}`,
    name: poi.name || "未命名餐厅",
    type: formatType(poi.type),
    address: formatAddress(poi.address),
    distance: Number(poi.distance || 0),
    rating: poi.biz_ext?.rating || "",
    cost: poi.biz_ext?.cost || "",
    location,
    photo: getPoiPhoto(poi),
    sourceQuery,
    sourceRadius: SEARCH_RADIUS,
  };
}

function formatAddress(address) {
  if (Array.isArray(address)) return address.filter(Boolean).join(" ") || "暂无地址";
  return address || "暂无地址";
}

function getPoiPhoto(poi) {
  return poi.photos?.[0]?.url || poi.photos?.[0]?.url_http || "";
}

function formatType(type = "") {
  const parts = type.split(";").filter(Boolean);
  return parts[parts.length - 1] || "餐厅";
}

// ========== 渲染 ==========
function renderActiveCategory() {
  const category = getActiveCategory();
  const list = resultsByCategory[category.id] || [];
  const selected = selectedByCategory[category.id];
  els.restaurantList.innerHTML = "";
  updateRandomButtonState();
  els.resultTitle.textContent = category.title;
  els.resultCount.textContent = list.length ? `${category.label} · 找到 ${list.length} 家` : "没有结果";

  if (list.length === 0) {
    els.pickedPanel.classList.add("hidden");
    setState(category.emptyTitle, category.emptyMessage, "empty");
    return;
  }
  hideState();

  const fragment = document.createDocumentFragment();
  list.forEach((restaurant) => {
    const item = document.createElement("li");
    const photo = document.createElement("div");
    const selectButton = document.createElement("div");
    const footer = document.createElement("div");
    const navigateLink = document.createElement("a");

    item.className = `restaurant-card${selected?.id === restaurant.id ? " selected" : ""}`;
    photo.className = `restaurant-photo${restaurant.photo ? "" : " placeholder"}`;
    if (restaurant.photo) photo.style.backgroundImage = `url("${restaurant.photo}")`;

    selectButton.className = "restaurant-select";
    selectButton.innerHTML = `
      <span class="restaurant-main">
        <span class="restaurant-name">${escapeHtml(restaurant.name)}</span>
        <span class="restaurant-meta">${escapeHtml(buildMeta(restaurant))}</span>
      </span>
      <span class="restaurant-address">${escapeHtml(restaurant.address)}</span>
    `;
    footer.className = "restaurant-footer";
    footer.innerHTML = `
      <span class="tag-row">
        <span class="tag">${escapeHtml(restaurant.type)}</span>
        ${isShowingDemo ? '<span class="tag">演示数据</span>' : ""}
      </span>
    `;

    navigateLink.className = "nav-tag";
    navigateLink.href = buildNavigationUrl(restaurant);
    navigateLink.target = "_blank";
    navigateLink.rel = "noreferrer";
    navigateLink.textContent = "导航";
    navigateLink.addEventListener("click", (event) => {
      event.stopPropagation();
      handleNavigate(event, restaurant);
    });

    footer.appendChild(navigateLink);
    item.append(photo, selectButton, footer);
    fragment.appendChild(item);
  });
  els.restaurantList.appendChild(fragment);
}

function buildMeta(restaurant) {
  const parts = [];
  if (restaurant.distance) parts.push(`${Math.round(restaurant.distance)} 米`);
  if (restaurant.rating) parts.push(`评分 ${restaurant.rating}`);
  if (restaurant.cost) parts.push(`人均 ¥${restaurant.cost}`);
  return parts.join(" · ") || "距离和评分暂无";
}

function getActiveResults() {
  return resultsByCategory[activeCategoryId] || [];
}

function updateRandomButtonState() {
  els.randomButton.disabled = isPicking || getActiveResults().length === 0;
}

function selectRestaurant(restaurant, categoryId = activeCategoryId) {
  selectedByCategory[categoryId] = restaurant;
  const fortuneIndex = getFortuneNumber(restaurant);
  els.pickedName.textContent = restaurant.name;
  els.pickedMeta.textContent = `${buildMeta(restaurant)} · ${restaurant.address}`;
  els.fortuneNumber.textContent = `第 ${fortuneIndex} 签`;
  els.navigateLink.href = buildNavigationUrl(restaurant);
  els.pickedPhoto.classList.toggle("placeholder", !restaurant.photo);
  els.pickedPhoto.style.backgroundImage = restaurant.photo ? `url("${restaurant.photo}")` : "";
  els.pickedPanel.classList.remove("hidden");
  if (categoryId === activeCategoryId) updateSelectedCardStyles();
}

function getFortuneNumber(restaurant) {
  const source = `${restaurant.id || ""}${restaurant.name || ""}`;
  const total = Array.from(source).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (total % 88) + 1;
}

function updateSelectedCardStyles() {
  const selected = selectedByCategory[activeCategoryId];
  els.restaurantList.querySelectorAll(".restaurant-card").forEach((card, index) => {
    const restaurant = (resultsByCategory[activeCategoryId] || [])[index];
    card.classList.toggle("selected", Boolean(selected && restaurant?.id === selected.id));
  });
}

function pickRestaurant() {
  const restaurants = getActiveResults();
  if (isPicking || !restaurants.length) return;
  const categoryId = activeCategoryId;
  isPicking = true;
  updateRandomButtonState();
  playRandomSpin();
  showDrawingStage(restaurants, getActiveCategory());

  window.setTimeout(() => {
    const index = Math.floor(Math.random() * restaurants.length);
    selectRestaurant(restaurants[index], categoryId);
    showPickedResult();
    isPicking = false;
    updateRandomButtonState();
  }, 1180);
}

function playRandomSpin() {
  els.randomButton.classList.add("is-spinning");
  window.setTimeout(() => els.randomButton.classList.remove("is-spinning"), 700);
}

function showDrawingStage(restaurants, category) {
  els.pickedPanel.classList.remove("hidden");
  els.pickedPanel.classList.add("is-drawing");
  els.drawingStage.classList.remove("hidden");
  els.drawingStage.setAttribute("aria-hidden", "false");
  els.pickedContent.classList.add("hidden");
  els.closePickedButton.disabled = true;
  els.drawingCategory.textContent = `从「${category.label}」里抽取`;

  let frame = 0;
  updateDrawingName(restaurants[0]?.name || "正在抽取");
  const timer = window.setInterval(() => {
    frame += 1;
    const candidate = restaurants[(frame * 3 + Math.floor(Math.random() * restaurants.length)) % restaurants.length];
    updateDrawingName(candidate?.name || "正在抽取");
    if (frame >= 9) window.clearInterval(timer);
  }, 110);
}

function updateDrawingName(name) {
  els.drawingName.classList.remove("is-changing");
  els.drawingName.textContent = name;
  void els.drawingName.offsetWidth;
  els.drawingName.classList.add("is-changing");
}

function showPickedResult() {
  els.pickedPanel.classList.remove("is-drawing");
  els.drawingStage.classList.add("hidden");
  els.drawingStage.setAttribute("aria-hidden", "true");
  els.pickedContent.classList.remove("hidden");
  els.closePickedButton.disabled = false;
}

function buildNavigationUrl(restaurant) {
  if (!restaurant.location) {
    return `https://uri.amap.com/search?keyword=${encodeURIComponent(restaurant.name)}`;
  }
  const [longitude, latitude] = restaurant.location.split(",");
  return `https://uri.amap.com/navigation?to=${longitude},${latitude},${encodeURIComponent(restaurant.name)}&mode=car&policy=1`;
}

function handleNavigate(event, restaurant) {
  if (!restaurant?.location) return;

  const ua = navigator.userAgent.toLowerCase();
  const isWechat = /micromessenger/.test(ua);
  const isMobile = /iphone|ipad|ipod|android/.test(ua);
  const [longitude, latitude] = restaurant.location.split(",");
  const name = restaurant.name;

  if (!isMobile) {
    event.preventDefault();
    window.open(
      `https://uri.amap.com/navigation?to=${longitude},${latitude},${encodeURIComponent(name)}&mode=car&policy=1`,
      '_blank'
    );
    return;
  }

  if (isWechat) {
    event.preventDefault();
    window.location.href = `https://uri.amap.com/navigation?to=${longitude},${latitude},${encodeURIComponent(name)}&mode=car&policy=1`;
    return;
  }

  event.preventDefault();
  const schemeUrl = `amapuri://route/plan/?sid=&did=&dlat=${latitude}&dlon=${longitude}&dname=${encodeURIComponent(name)}&dev=0&t=0`;
  const webUrl = `https://uri.amap.com/navigation?to=${longitude},${latitude},${encodeURIComponent(name)}&mode=car&policy=1`;

  const start = Date.now();
  window.location.href = schemeUrl;

  setTimeout(() => {
    if (Date.now() - start < 2600) {
      window.location.href = webUrl;
    }
  }, 2500);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ========== 地址建议 ==========
function hideSuggestions() {
  els.locationSuggestions.classList.add("hidden");
  els.locationSuggestions.replaceChildren();
}

function renderSuggestions(tips) {
  els.locationSuggestions.replaceChildren();
  const usableTips = tips.filter((tip) => tip.name && tip.location).slice(0, 8);
  if (!usableTips.length) { hideSuggestions(); return; }
  usableTips.forEach((tip) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion-button";
    button.setAttribute("role", "option");
    button.innerHTML = `
      <span class="suggestion-name">${escapeHtml(tip.name)}</span>
      <span class="suggestion-address">${escapeHtml([tip.district, tip.address].filter(Boolean).join(" "))}</span>
    `;
    button.addEventListener("click", () => selectSuggestion(tip));
    els.locationSuggestions.appendChild(button);
  });
  els.locationSuggestions.classList.remove("hidden");
}

function selectSuggestion(tip) {
  const address = [tip.district, tip.name].filter(Boolean).join(" ");
  const center = normalizeLocation(tip.location);
  isApplyingAddress = true;
  els.addressInput.value = address;
  isApplyingAddress = false;
  selectedLocation = { address, center };
  updateClearButton();
  hideSuggestions();
  runSearch({ address, center });
}

function normalizeLocation(location) {
  if (Array.isArray(location)) return location;
  if (typeof location === "string") return location.split(",").map(Number);
  const lng = location.lng ?? location.getLng?.();
  const lat = location.lat ?? location.getLat?.();
  return [lng, lat];
}

function updateSuggestions() {
  const keyword = els.addressInput.value.trim();
  if (!keyword || keyword.length < 2 || !getHasAmapProxy()) { hideSuggestions(); return; }
  clearTimeout(suggestionTimer);
  suggestionTimer = setTimeout(async () => {
    try {
      const result = await requestAmap("tips", { keywords: keyword });
      renderSuggestions(result?.tips || []);
    } catch { hideSuggestions(); }
  }, 260);
}

// ========== 预加载 ==========
function preloadSearch(address, center) {
  clearTimeout(preloadTimer);
  preloadTimer = setTimeout(async () => {
    if (!address || !getHasAmapProxy()) return;
    const cacheKey = getCacheKey(address);
    if (localStorage.getItem(cacheKey)) return;
    try {
      const resolvedCenter = center || (await geocodeAddress(address));
      const restaurantCategory = CATEGORIES.find((c) => c.id === "restaurants");
      const dessertCategory = CATEGORIES.find((c) => c.id === "dessert");
      const [restaurants, desserts] = await Promise.all([
        searchCategory(resolvedCenter, restaurantCategory),
        searchCategory(resolvedCenter, dessertCategory),
      ]);
      const dessertFallback = getDessertFallback(restaurants);
      setCachedResult(address, {
        restaurants,
        dessert: getSortedLimitedResults(dedupeRestaurants([...desserts, ...dessertFallback])),
      });
    } catch {
      // 预加载失败静默处理
    }
  }, 2000);
}

// ========== 定位 ==========
function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("当前浏览器不支持自动定位")); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  });
}

async function getCurrentCenter() {
  const position = await getBrowserPosition();
  return [position.coords.longitude, position.coords.latitude];
}

async function locateCurrentPosition({ force = false } = {}) {
  if (!force) return;
  hideSuggestions();
  els.locationButton.disabled = true;
  els.locationButton.classList.add("is-locating");
  setState("正在获取当前位置", "如果浏览器询问定位权限，请点击允许。");
  try {
    const center = await getCurrentCenter();
    const address = await reverseGeocode(center);
    isApplyingAddress = true;
    els.addressInput.value = address;
    isApplyingAddress = false;
    selectedLocation = { address, center };
    updateClearButton();
    await runSearch({ address, center });
  } catch (error) {
    const message = error.message || "定位失败";
    const isPermissionDenied = message.toLowerCase().includes("denied");
    setState(
      isPermissionDenied ? "浏览器拒绝了定位" : "定位没有成功",
      isPermissionDenied ? "请在浏览器地址栏附近重新允许定位权限，或者直接输入地址并从下拉框选择位置。" : `${message}。你也可以手动输入地址，再从下拉框里选择最匹配的位置。`,
      "error",
    );
  } finally {
    els.locationButton.disabled = false;
    els.locationButton.classList.remove("is-locating");
  }
}

async function handleSearch() {
  const address = els.addressInput.value.trim();
  const now = Date.now();
  if (now - lastSearchTime < SEARCH_COOLDOWN) {
    setState("搜索太频繁", "请等待3秒后再搜索。", "error");
    return;
  }
  await runSearch({
    address,
    center: selectedLocation?.address === address ? selectedLocation.center : null,
  });
}

// ========== 主搜索逻辑 ==========
async function runSearch({ address, center = null }) {
  const now = Date.now();
  if (now - lastSearchTime < SEARCH_COOLDOWN) {
    els.searchHint.textContent = "搜索太频繁，请稍后再试";
    return;
  }
  lastSearchTime = now;

  els.pickedPanel.classList.add("hidden");
  hideSuggestions();

  if (!address) {
    setState("先输入一个地址吧", "也可以点一下输入框，自动获取你当前的位置。");
    els.addressInput.focus();
    return;
  }

  // 检查缓存
  const cached = getCachedResult(address);
  if (cached) {
    resultsByCategory = cached;
    isShowingDemo = false;
    renderActiveCategory();
    els.searchHint.textContent = `已搜索「${address}」方圆 ${SEARCH_RADIUS} 米内的餐厅和甜品下午茶。（来自缓存）`;
    return;
  }

  setBusy(true);
  els.randomButton.disabled = true;
  selectedByCategory = { restaurants: null, dessert: null };
  setState("正在找吃的", "正在搜索 500 米内的餐厅和甜品下午茶。");

  try {
    if (!getHasAmapProxy()) {
      resultsByCategory = { restaurants: demoResults.restaurants, dessert: demoResults.dessert };
      isShowingDemo = true;
      renderActiveCategory();
      els.searchHint.textContent = "当前是演示模式；部署到 Vercel 并配置 AMAP_KEY 后可查询真实餐厅。";
      return;
    }

    const resolvedCenter = center || (await geocodeAddress(address));

    const restaurantCategory = CATEGORIES.find((c) => c.id === "restaurants");
    const dessertCategory = CATEGORIES.find((c) => c.id === "dessert");

    // 并行搜索餐厅和甜点（每个只发1个请求到Vercel）
    const [restaurants, desserts] = await Promise.all([
      searchCategory(resolvedCenter, restaurantCategory),
      searchCategory(resolvedCenter, dessertCategory),
    ]);

    const dessertFallback = getDessertFallback(restaurants);

    resultsByCategory = {
      restaurants,
      dessert: getSortedLimitedResults(dedupeRestaurants([...desserts, ...dessertFallback])),
    };

    setCachedResult(address, resultsByCategory);

    isShowingDemo = false;
    renderActiveCategory();
    els.searchHint.textContent = `已搜索「${address}」方圆 ${SEARCH_RADIUS} 米内的餐厅和甜品下午茶。`;
  } catch (error) {
    resultsByCategory = { restaurants: [], dessert: [] };
    els.restaurantList.innerHTML = "";
    els.resultCount.textContent = "没有结果";
    els.randomButton.disabled = true;
    setState("搜索失败", error.message || "稍后再试一次，或者换个地址。", "error");
  } finally {
    setBusy(false);
  }
}

function switchCategory(categoryId) {
  activeCategoryId = categoryId;
  els.tabButtons.forEach((button) => {
    const isActive = button.dataset.category === categoryId;
    button.classList.toggle("active", isActive);
  });
  renderActiveCategory();
}

// ========== 事件绑定 ==========
els.searchButton.addEventListener("click", handleSearch);
els.locationButton.addEventListener("click", () => locateCurrentPosition({ force: true }));
els.randomButton.addEventListener("click", pickRestaurant);
els.pickAgainButton.addEventListener("click", pickRestaurant);
els.closePickedButton.addEventListener("click", () => els.pickedPanel.classList.add("hidden"));
els.pickedPanel.addEventListener("click", (event) => { if (event.target === els.pickedPanel) els.pickedPanel.classList.add("hidden"); });
els.tabButtons.forEach((button) => button.addEventListener("click", () => switchCategory(button.dataset.category)));
els.addressInput.addEventListener("keydown", (event) => { if (event.key === "Enter") handleSearch(); });
els.addressInput.addEventListener("focus", () => updateSuggestions());
els.addressInput.addEventListener("click", () => updateSuggestions());
els.addressInput.addEventListener("input", () => {
  if (!isApplyingAddress) selectedLocation = null;
  updateSuggestions();
  updateClearButton();
  const address = els.addressInput.value.trim();
  if (address.length >= 4) {
    preloadSearch(address, selectedLocation?.address === address ? selectedLocation.center : null);
  }
});
els.clearButton.addEventListener("click", () => {
  els.addressInput.value = "";
  els.addressInput.focus();
  selectedLocation = null;
  updateClearButton();
});

els.navigateLink.addEventListener("click", (event) => {
  const restaurant = selectedByCategory[activeCategoryId];
  if (restaurant) handleNavigate(event, restaurant);
});

document.addEventListener("click", (event) => { if (!event.target.closest(".search-panel")) hideSuggestions(); });
