/*
 * 计时逻辑模拟测试（不需要装扩展，直接 node test/sim.js）
 * 用可控时钟 + 内存版 chrome API，验证切窗口 / 空闲 / 事件丢失等场景。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', 'src');

let T = new Date(2026, 9, 5, 10, 0, 0).getTime();
const store = new Map();
const listeners = {};

let focusedWin = 1;
let idleState = 'active';
let activeTab = { id: 1, url: 'https://github.com/explore', title: 'GitHub · Explore' };

const clone = (v) => JSON.parse(JSON.stringify(v));

const on = (name, fn) => {
  (listeners[name] = listeners[name] || []).push(fn);
};
const emit = async (name, ...args) => {
  for (const fn of listeners[name] || []) await fn(...args);
};

const chrome = {
  tabs: {
    query: async () => (focusedWin === -1 ? [] : [activeTab]),
    onActivated: { addListener: (f) => on('tabs.activated', f) },
    onRemoved: { addListener: (f) => on('tabs.removed', f) },
    onUpdated: { addListener: (f) => on('tabs.updated', f) }
  },
  windows: {
    WINDOW_ID_NONE: -1,
    getLastFocused: async () => ({ id: focusedWin, focused: focusedWin !== -1 }),
    onFocusChanged: { addListener: (f) => on('win.focus', f) }
  },
  idle: {
    setDetectionInterval: () => {},
    queryState: async () => idleState,
    onStateChanged: { addListener: (f) => on('idle.state', f) }
  },
  storage: {
    local: {
      get: (keys, cb) => {
        const out = {};
        if (keys === null || keys === undefined) {
          for (const [k, v] of store) out[k] = clone(v);
        } else if (typeof keys === 'string') {
          if (store.has(keys)) out[keys] = clone(store.get(keys));
        } else if (Array.isArray(keys)) {
          keys.forEach((k) => { if (store.has(k)) out[k] = clone(store.get(k)); });
        } else if (typeof keys === 'object') {
          Object.keys(keys).forEach((k) => {
            out[k] = store.has(k) ? clone(store.get(k)) : keys[k];
          });
        }
        queueMicrotask(() => cb(out));
      },
      set: (obj, cb) => {
        Object.keys(obj).forEach((k) => store.set(k, clone(obj[k])));
        queueMicrotask(() => cb && cb());
      },
      remove: (keys, cb) => {
        (Array.isArray(keys) ? keys : [keys]).forEach((k) => store.delete(k));
        queueMicrotask(() => cb && cb());
      }
    }
  },
  alarms: {
    create: () => {},
    onAlarm: { addListener: (f) => on('alarm', f) }
  },
  runtime: {
    lastError: null,
    onStartup: { addListener: (f) => on('startup', f) },
    onInstalled: { addListener: (f) => on('installed', f) },
    onMessage: { addListener: (f) => on('message', f) }
  }
};

class FakeDate extends Date {
  constructor(...a) { if (a.length === 0) super(T); else super(...a); }
  static now() { return T; }
}

const ctx = vm.createContext({
  chrome,
  Date: FakeDate,
  URL,
  JSON,
  Math,
  console,
  Promise,
  queueMicrotask,
  setInterval: () => 0,
  clearInterval: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {}
});

// 模拟扩展的 importScripts
ctx.importScripts = (...files) => {
  files.forEach((f) => {
    const p = path.join(ROOT, f);
    vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p });
  });
};

vm.runInContext(fs.readFileSync(path.join(ROOT, 'background.js'), 'utf8'), ctx, {
  filename: path.join(ROOT, 'background.js')
});

const tick = () => ctx.tick();
const advance = (seconds) => { T += seconds * 1000; };

function msOf(key) {
  const m = ctx.TT.memory();
  return m && m.pages[key] ? m.pages[key].ms : 0;
}
function visitsOf(key) {
  const m = ctx.TT.memory();
  return m && m.pages[key] ? m.pages[key].visits : 0;
}

const results = [];
function check(label, actual, expected, tolerance) {
  const ok = Math.abs(actual - expected) <= (tolerance || 0);
  results.push({ ok, label, actual, expected });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  (实际 ${actual}, 期望 ${expected})`);
}

(async function run() {
  await ctx.bootPromise;

  const KEY = 'github.com/explore';

  // --- 场景 1：正常停留 60 秒 ---
  for (let i = 0; i < 60; i++) { advance(1); await tick(); }
  check('场景1 在前台停留 60 秒', msOf(KEY) / 1000, 60, 2);
  check('场景1 首次访问只计 1 次', visitsOf(KEY), 1, 0);

  // --- 场景 2：切到别的程序（触发 onFocusChanged），停留 60 秒 ---
  focusedWin = -1;
  await emit('win.focus', -1);
  for (let i = 0; i < 60; i++) { advance(1); await tick(); }
  check('场景2 切走后 60 秒不计入', msOf(KEY) / 1000, 60, 2);

  // --- 场景 3：切回 Edge（触发 onFocusChanged），再停留 60 秒 ---
  focusedWin = 1;
  await emit('win.focus', 1);
  for (let i = 0; i < 60; i++) { advance(1); await tick(); }
  check('场景3 切回后恢复计时', msOf(KEY) / 1000, 120, 3);
  check('场景3 切走切回未虚增打开次数', visitsOf(KEY), 1, 0);

  // --- 场景 4：事件丢失 —— 直接切走但不触发任何事件 ---
  const before = msOf(KEY) / 1000;
  focusedWin = -1;
  for (let i = 0; i < 12; i++) { advance(1); await tick(); }
  check('场景4 事件丢失时心跳仍能停表', msOf(KEY) / 1000, before, 6);

  // --- 场景 5：事件丢失 —— 直接切回但不触发任何事件 ---
  focusedWin = 1;
  const beforeBack = msOf(KEY) / 1000;
  for (let i = 0; i < 60; i++) { advance(1); await tick(); }
  check('场景5 事件丢失时心跳仍能恢复计时', msOf(KEY) / 1000, beforeBack + 60, 8);

  // --- 场景 6：系统空闲 60 秒 ---
  const beforeIdle = msOf(KEY) / 1000;
  idleState = 'idle';
  await emit('idle.state', 'idle');
  for (let i = 0; i < 60; i++) { advance(1); await tick(); }
  check('场景6 系统空闲期间不计时', msOf(KEY) / 1000, beforeIdle, 3);

  // --- 场景 7：空闲恢复 ---
  idleState = 'active';
  await emit('idle.state', 'active');
  for (let i = 0; i < 30; i++) { advance(1); await tick(); }
  check('场景7 空闲结束后恢复计时', msOf(KEY) / 1000, beforeIdle + 30, 5);

  // --- 场景 8：真实切换页面应计为新访问 ---
  activeTab = { id: 2, url: 'https://bilibili.com/video/BV1xx', title: '某视频' };
  await emit('tabs.activated', { tabId: 2 });
  for (let i = 0; i < 20; i++) { advance(1); await tick(); }
  check('场景8 换页面计入新站点', msOf('bilibili.com/video/BV1xx') / 1000, 20, 3);
  check('场景8 新页面访问次数为 1', visitsOf('bilibili.com/video/BV1xx'), 1, 0);

  // --- 场景 9：edge:// 内部页不计 ---
  activeTab = { id: 3, url: 'edge://extensions/', title: '扩展' };
  await emit('tabs.activated', { tabId: 3 });
  const beforeInternal = msOf('bilibili.com/video/BV1xx') / 1000;
  for (let i = 0; i < 30; i++) { advance(1); await tick(); }
  check('场景9 内部页不计时', msOf('bilibili.com/video/BV1xx') / 1000, beforeInternal, 2);

  // --- 场景 10：从别的页面切回来，应算一次新访问 ---
  activeTab = { id: 1, url: 'https://github.com/explore', title: 'GitHub · Explore' };
  await emit('tabs.activated', { tabId: 1 });
  for (let i = 0; i < 20; i++) { advance(1); await tick(); }
  check('场景10 从别的页面切回算新访问', visitsOf(KEY), 2, 0);

  const failed = results.filter((r) => !r.ok);
  console.log('\n' + '='.repeat(50));
  console.log(`共 ${results.length} 项，通过 ${results.length - failed.length}，失败 ${failed.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error('测试异常：', e);
  process.exit(1);
});
