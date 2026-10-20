importScripts('lib/categories.js', 'lib/store.js');

var TICK_MS = 1000;
var RUNTIME_MS = 5000;
var GAP_LIMIT_MS = 150000;
var IDLE_SECONDS = 60;
var SPOT_MS = 4000;
var ALARM = 'tt-tick';

var cur = null;
var counting = false;
var winFocused = false;
var idleState = 'active';
var paused = false;
var customCat = {};
var lastFlush = 0;
var lastRuntime = 0;
var lastVisitKey = null;
var lastSpot = 0;
var ticking = false;
var booted = false;

var bootPromise = boot();

function storageGet(keys) {
  return new Promise(function (res) {
    chrome.storage.local.get(keys, function (v) { res(v || {}); });
  });
}

function storageSet(obj) {
  return new Promise(function (res) {
    chrome.storage.local.set(obj, function () { res(); });
  });
}

async function boot() {
  try { chrome.idle.setDetectionInterval(IDLE_SECONDS); } catch (e) { }

  var got = await storageGet(['runtime', 'settings', 'custom_cat']);
  var st = got.settings || {};
  paused = !!st.paused;
  customCat = got.custom_cat || {};

  try {
    var w = await chrome.windows.getLastFocused();
    winFocused = !!(w && w.focused);
  } catch (e) { winFocused = false; }

  try {
    idleState = await chrome.idle.queryState(IDLE_SECONDS);
  } catch (e) { idleState = 'active'; }

  var now = Date.now();
  var rt = got.runtime;
  if (rt && rt.lastVisitKey) lastVisitKey = rt.lastVisitKey;

  if (rt && rt.counting && rt.page && rt.lastFlush) {
    var gap = now - rt.lastFlush;
    if (gap > 0 && gap < GAP_LIMIT_MS) {
      await TT.ensureDay(rt.lastFlush);
      TT.addMs(rt.page, gap, rt.lastFlush);
      await TT.persist(true);
    }
  }

  await TT.ensureDay(now);
  lastFlush = now;
  await refresh();
  startTicker();

  try {
    chrome.alarms.create(ALARM, { periodInMinutes: 1 });
  } catch (e) { }

  if (!st.installed) {
    await storageSet({ settings: { paused: false, idleSec: IDLE_SECONDS, installed: true } });
  }
  try { await TT.prune(); } catch (e) { }

  booted = true;
}

function startTicker() {
  if (startTicker.on) return;
  startTicker.on = true;
  setInterval(function () { tick(); }, TICK_MS);
}

function settle(now) {
  var gap = now - lastFlush;
  if (counting && cur && gap > 0 && gap < GAP_LIMIT_MS) {
    TT.addMs(cur, gap, lastFlush);
  }
  lastFlush = now;
}

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    var now = Date.now();
    await TT.ensureDay(now);
    settle(now);
    await spotCheck(now);
    await TT.persist(false);
    await saveRuntime(now, false);
  } catch (e) {
    // 静默：单次 tick 失败不影响后续
  } finally {
    ticking = false;
  }
}

// 心跳纠偏：不信任事件，每 4 秒用真实 API 复核一次窗口焦点与空闲状态。
// 防止 onFocusChanged 偶发漏触发导致计时永久卡死在暂停态。
async function spotCheck(now) {
  if (now - lastSpot < SPOT_MS) return;
  lastSpot = now;

  var prevFocused = winFocused;
  var prevIdle = idleState;

  try {
    var w = await chrome.windows.getLastFocused();
    winFocused = !!(w && w.focused);
  } catch (e) {
    winFocused = false;
  }
  try {
    idleState = await chrome.idle.queryState(IDLE_SECONDS);
  } catch (e) { /* 查询失败则沿用事件带来的状态 */ }

  if (winFocused !== prevFocused || idleState !== prevIdle) {
    await refresh();
  }
}

async function saveRuntime(now, force) {
  if (!force && now - lastRuntime < RUNTIME_MS) return;
  lastRuntime = now;
  await storageSet({
    runtime: {
      counting: counting,
      page: counting ? cur : null,
      lastVisitKey: lastVisitKey,
      lastFlush: now
    }
  });
}

async function readActiveTab() {
  var tabs;
  try {
    tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  } catch (e) { return null; }
  var t = tabs && tabs[0];
  if (!t || !t.url) return null;
  if (!/^https?:\/\//i.test(t.url)) return null;

  var u;
  try { u = new URL(t.url); } catch (e) { return null; }

  var host = u.hostname.replace(/^www\./i, '');
  var path = (u.pathname === '/' ? '' : u.pathname).slice(0, 180);
  if (!host) return null;

  return {
    key: host + path,
    host: host,
    path: path,
    title: String(t.title || host).slice(0, 120),
    cat: TTCat.classify(host, customCat)
  };
}

// 串行化：事件与心跳可能同时触发刷新，串成一条链避免状态互相覆盖。
var refreshChain = Promise.resolve();

function refresh() {
  refreshChain = refreshChain.then(doRefresh).catch(function () { });
  return refreshChain;
}

async function doRefresh() {
  var now = Date.now();
  settle(now);

  var tab = await readActiveTab();
  cur = tab;
  counting = !!tab && winFocused && idleState === 'active' && !paused;
  lastFlush = now;

  // lastVisitKey 独立于 cur：切走窗口时 cur 会被清空，但"上次访问的页面"要记住，
  // 否则每次切走再回来都会被误算成一次新的打开。
  if (counting && tab && tab.key !== lastVisitKey) {
    lastVisitKey = tab.key;
    await TT.ensureDay(now);
    TT.markVisit(tab, now);
    await TT.persist(false);
  }

  await saveRuntime(now, true);
}

function guard(fn) {
  return function (a, b, c) {
    bootPromise.then(function () { return fn(a, b, c); }).catch(function () { });
  };
}

chrome.tabs.onActivated.addListener(guard(function () { refresh(); }));
chrome.tabs.onRemoved.addListener(guard(function () { refresh(); }));
chrome.tabs.onUpdated.addListener(guard(function (tabId, info, tab) {
  if (info && (info.status === 'complete' || info.url)) refresh();
}));
chrome.windows.onFocusChanged.addListener(guard(function (winId) {
  winFocused = (winId !== chrome.windows.WINDOW_ID_NONE);
  refresh();
}));
chrome.idle.onStateChanged.addListener(guard(function (state) {
  idleState = state;
  refresh();
}));
chrome.alarms.onAlarm.addListener(guard(function (a) {
  if (a && a.name === ALARM) tick();
}));
chrome.runtime.onStartup.addListener(guard(function () {
  return storageSet({ runtime: { counting: false, page: null, lastFlush: Date.now() } });
}));
chrome.runtime.onInstalled.addListener(guard(function () {
  refresh();
}));

async function summaryFor(todayOnly) {
  await tick();
  var day = TT.memory() || TT.emptyDay();
  var s = TT.summarize(day);
  var curMs = (cur && day.pages[cur.key]) ? day.pages[cur.key].ms : 0;
  return {
    ok: true,
    counting: counting,
    paused: paused,
    idleState: idleState,
    winFocused: winFocused,
    cur: cur ? { host: cur.host, path: cur.path, title: cur.title, cat: cur.cat, ms: curMs } : null,
    total: s.total,
    hosts: s.hosts.slice(0, 25).map(function (h) {
      return { host: h.host, ms: h.ms, cat: h.cat, visits: h.visits };
    }),
    byCat: s.byCat,
    hours: s.hours
  };
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  (async function () {
    await bootPromise;
    var type = msg && msg.type;

    if (type === 'status') {
      sendResponse(await summaryFor());
      return;
    }

    if (type === 'flush') {
      await tick();
      await TT.persist(true);
      sendResponse({ ok: true });
      return;
    }

    if (type === 'togglePause') {
      paused = !paused;
      var got = await storageGet(['settings']);
      var st = got.settings || {};
      st.paused = paused;
      await storageSet({ settings: st });
      await refresh();
      sendResponse({ ok: true, paused: paused });
      return;
    }

    if (type === 'setCustomCat') {
      customCat = msg.map || {};
      await storageSet({ custom_cat: customCat });
      TT.resetMemory();
      await refresh();
      sendResponse({ ok: true });
      return;
    }

    if (type === 'prune') {
      var n = await TT.prune();
      sendResponse({ ok: true, removed: n });
      return;
    }

    sendResponse({ ok: false });
  })().catch(function (e) {
    try { sendResponse({ ok: false, error: String(e) }); } catch (err) { }
  });
  return true;
});
