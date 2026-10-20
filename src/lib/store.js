(function (g) {
  'use strict';

  var DAY_PREFIX = 'day:';
  var PERSIST_MIN_MS = 5000;
  var RETAIN_DAYS = 90;

  var hasChrome = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local);

  var memDate = null;
  var mem = null;
  var dirty = false;
  var lastPersist = 0;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function dateKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function shiftDate(key, days) {
    var p = String(key).split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    d.setDate(d.getDate() + days);
    return dateKey(d.getTime());
  }

  function emptyDay() {
    return { pages: {}, hours: new Array(24).fill(0), total: 0 };
  }

  function normalize(d) {
    if (!d || typeof d !== 'object') d = emptyDay();
    if (!d.pages || typeof d.pages !== 'object') d.pages = {};
    if (!Array.isArray(d.hours) || d.hours.length !== 24) d.hours = new Array(24).fill(0);
    if (typeof d.total !== 'number') d.total = 0;
    return d;
  }

  function localGet(keys) {
    return new Promise(function (res) {
      if (!hasChrome) {
        res(g.TTDemo ? g.TTDemo.get(keys) : {});
        return;
      }
      chrome.storage.local.get(keys, function (v) { res(v || {}); });
    });
  }

  function localSet(obj) {
    return new Promise(function (res) {
      if (!hasChrome) { res(); return; }
      chrome.storage.local.set(obj, function () { res(); });
    });
  }

  function localRemove(keys) {
    return new Promise(function (res) {
      if (!hasChrome) { res(); return; }
      chrome.storage.local.remove(keys, function () { res(); });
    });
  }

  async function ensureDay(ts) {
    var key = dateKey(ts);
    if (key === memDate && mem) return;
    await persist(true);
    var got = await localGet(DAY_PREFIX + key);
    mem = normalize(got[DAY_PREFIX + key]);
    memDate = key;
    dirty = false;
  }

  function ensurePage(page, atTs) {
    if (!mem || !page) return null;
    var p = mem.pages[page.key];
    if (!p) {
      p = mem.pages[page.key] = {
        host: page.host,
        path: page.path || '',
        title: page.title || page.host,
        cat: page.cat || '其他',
        ms: 0,
        // 访问次数只由 markVisit 负责累加，这里必须从 0 开始，
        // 否则每次新建页面都会被多算一次（读作 2 次）。
        visits: 0,
        first: atTs,
        last: atTs
      };
    }
    return p;
  }

  function addMs(page, ms, atTs) {
    if (!mem || !page || !(ms > 0)) return;
    var p = ensurePage(page, atTs);
    p.ms += ms;
    p.last = atTs;
    if (page.title) p.title = page.title;
    if (page.cat) p.cat = page.cat;
    var h = new Date(atTs).getHours();
    mem.hours[h] = (mem.hours[h] || 0) + ms;
    mem.total += ms;
    dirty = true;
  }

  function markVisit(page, atTs) {
    if (!mem || !page) return;
    var p = ensurePage(page, atTs);
    p.visits = (p.visits || 0) + 1;
    dirty = true;
  }

  async function persist(force) {
    if (!mem || !memDate || !dirty) return;
    var now = Date.now();
    if (!force && now - lastPersist < PERSIST_MIN_MS) return;
    dirty = false;
    lastPersist = now;
    var obj = {};
    obj[DAY_PREFIX + memDate] = mem;
    await localSet(obj);
  }

  async function prune() {
    var all = await localGet(null);
    var cutoff = dateKey(Date.now() - RETAIN_DAYS * 86400000);
    var kill = Object.keys(all || {}).filter(function (k) {
      return k.indexOf(DAY_PREFIX) === 0 && k.slice(DAY_PREFIX.length) < cutoff;
    });
    if (kill.length) await localRemove(kill);
    return kill.length;
  }

  function summarize(day) {
    var pages = (day && day.pages) || {};
    var hosts = {};
    var byCat = {};
    var total = 0;

    Object.keys(pages).forEach(function (k) {
      var p = pages[k];
      var ms = p.ms || 0;
      var cat = p.cat || '其他';
      total += ms;
      byCat[cat] = (byCat[cat] || 0) + ms;

      var h = hosts[p.host];
      if (!h) h = hosts[p.host] = { host: p.host, ms: 0, cat: cat, visits: 0, pages: [] };
      h.ms += ms;
      h.visits += p.visits || 1;
      h.pages.push({
        key: k, path: p.path, title: p.title, ms: ms,
        cat: cat, visits: p.visits || 1, last: p.last
      });
    });

    var list = Object.keys(hosts).map(function (k) { return hosts[k]; });
    list.sort(function (a, b) { return b.ms - a.ms; });
    list.forEach(function (h) {
      h.pages.sort(function (a, b) { return b.ms - a.ms; });
    });

    return {
      total: total,
      hosts: list,
      byCat: byCat,
      hours: (day && day.hours) || new Array(24).fill(0)
    };
  }

  function mergeDays(days) {
    var out = emptyDay();
    days.forEach(function (d) {
      var dd = normalize(d);
      Object.keys(dd.pages).forEach(function (k) {
        var src = dd.pages[k];
        var dst = out.pages[k];
        if (!dst) {
          out.pages[k] = {
            host: src.host, path: src.path, title: src.title, cat: src.cat,
            ms: src.ms || 0, visits: src.visits || 1, first: src.first, last: src.last
          };
        } else {
          dst.ms += src.ms || 0;
          dst.visits += src.visits || 1;
          dst.last = Math.max(dst.last || 0, src.last || 0);
        }
      });
      for (var i = 0; i < 24; i++) out.hours[i] += dd.hours[i] || 0;
      out.total += dd.total || 0;
    });
    return out;
  }

  function fmt(ms) {
    var s = Math.round((ms || 0) / 1000);
    if (s < 60) return s + ' 秒';
    var m = Math.floor(s / 60);
    if (m < 60) return m + ' 分钟';
    var h = Math.floor(m / 60);
    var rm = m % 60;
    return rm ? h + ' 小时 ' + rm + ' 分' : h + ' 小时';
  }

  function fmtClock(ms) {
    var s = Math.round((ms || 0) / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var ss = s % 60;
    if (h) return h + ':' + pad(m) + ':' + pad(ss);
    return m + ':' + pad(ss);
  }

  async function readDay(key) {
    var got = await localGet(DAY_PREFIX + key);
    return normalize(got[DAY_PREFIX + key]);
  }

  async function readRange(endKey, count) {
    var keys = [];
    for (var i = count - 1; i >= 0; i--) keys.push(shiftDate(endKey, -i));
    var full = keys.map(function (k) { return DAY_PREFIX + k; });
    var got = await localGet(full);
    var list = keys.map(function (k) { return normalize(got[DAY_PREFIX + k]); });
    return { keys: keys, days: list };
  }

  g.TT = {
    dateKey: dateKey,
    shiftDate: shiftDate,
    emptyDay: emptyDay,
    normalize: normalize,
    ensureDay: ensureDay,
    addMs: addMs,
    markVisit: markVisit,
    persist: persist,
    prune: prune,
    summarize: summarize,
    mergeDays: mergeDays,
    readDay: readDay,
    readRange: readRange,
    fmt: fmt,
    fmtClock: fmtClock,
    currentDate: function () { return memDate; },
    memory: function () { return mem; },
    resetMemory: function () { memDate = null; mem = null; dirty = false; },
    hasChrome: hasChrome
  };
})(typeof self !== 'undefined' ? self : this);
