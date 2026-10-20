(function (g) {
  'use strict';

  var KEY = 'ui:lang';
  var DEFAULT = 'zh';

  var ZH = {
    'app.name': '网页时间统计',
    'doc.popup': '网页时间统计',
    'doc.dash': '网页时间统计 · 报告',

    'popup.totalLabel': '今天网页时间',
    'popup.sectionTitle': '今日站点排行',
    'popup.siteCount': '{n} 个站点',
    'popup.visits': '{n} 次',
    'popup.loading': '正在读取…',
    'popup.preview': '预览模式（演示数据）',
    'popup.paused': '已暂停记录',
    'popup.idle': '当前未计时（窗口未聚焦或已空闲）',
    'popup.empty': '今天还没有记录到网页时间',

    'btn.report': '完整报告',
    'btn.pause': '暂停记录',
    'btn.resume': '继续记录',

    'lang.switchTo': 'Switch to English',

    'dash.subtitle': '数据保存在本机，不上传任何服务器',
    'dash.rangeLine': '统计范围：{r} · 数据保存在本机，不上传任何服务器',
    'dash.export': '导出 JSON',
    'dash.range.today': '今天',
    'dash.range.7': '最近 7 天',
    'dash.range.30': '最近 30 天',

    'panel.hours': '时段分布',
    'panel.hoursHint': '按小时的累计时长',
    'panel.cats': '分类占比',
    'panel.overview': '记录概览',
    'panel.sites': '站点排行',
    'panel.sitesHint': '展开可看页面级明细',

    'card.total': '总时长',
    'card.avg': '日均',
    'card.top': '最常访问',
    'card.sitesPages': '站点 / 页面',
    'card.today': '今天',
    'card.days': '共 {n} 天',
    'card.avgNote': '按自然日摊平',
    'card.noRecord': '暂无记录',
    'card.opens': '{n} 次打开',

    'ov.days': '统计天数',
    'ov.sites': '涉及站点',
    'ov.pages': '涉及页面',
    'ov.opens': '打开次数',
    'ov.peak': '高峰时段',
    'ov.perPage': '单页均时长',
    'ov.daysVal': '{n} 天',
    'ov.dayVal': '{n} 天',
    'ov.sitesVal': '{n} 个',
    'ov.pagesVal': '{n} 个',
    'ov.opensVal': '{n} 次',

    'dash.empty': '暂无数据',
    'dash.more': '其余 {n} 个页面…',
    'dash.visits': '{n} 次',
    'dash.visitOne': '{n} 次',
    'dash.hourTip': '{h}:00 时段 · {v}',
    'dash.footReal': '数据来源：本机扩展存储（storage.local），最多保留 90 天最近记录',
    'dash.footDemo': '预览模式 · 当前显示的是演示数据，安装扩展后这里会变成你的真实记录',
    'dash.noExport': '预览模式下没有真实数据可导出。安装扩展后再试。'
  };

  var EN = {
    'app.name': 'Web Time',
    'doc.popup': 'Web Time',
    'doc.dash': 'Web Time · Report',

    'popup.totalLabel': 'Web time today',
    'popup.sectionTitle': 'Top sites today',
    'popup.siteCount': '{n} sites',
    'popup.visits': '{n}x',
    'popup.loading': 'Loading…',
    'popup.preview': 'Preview mode (sample data)',
    'popup.paused': 'Recording paused',
    'popup.idle': 'Not counting (window unfocused or idle)',
    'popup.empty': 'No web time recorded today',

    'btn.report': 'Full report',
    'btn.pause': 'Pause',
    'btn.resume': 'Resume',

    'lang.switchTo': '切换到中文',

    'dash.subtitle': 'All data stays on this device',
    'dash.rangeLine': 'Range: {r} · All data stays on this device',
    'dash.export': 'Export JSON',
    'dash.range.today': 'Today',
    'dash.range.7': 'Last 7 days',
    'dash.range.30': 'Last 30 days',

    'panel.hours': 'Hourly distribution',
    'panel.hoursHint': 'Total time per hour',
    'panel.cats': 'Category share',
    'panel.overview': 'Overview',
    'panel.sites': 'Site ranking',
    'panel.sitesHint': 'Expand for page detail',

    'card.total': 'Total time',
    'card.avg': 'Daily average',
    'card.top': 'Top site',
    'card.sitesPages': 'Sites / Pages',
    'card.today': 'Today',
    'card.days': '{n} days',
    'card.avgNote': 'Averaged over calendar days',
    'card.noRecord': 'No records',
    'card.opens': '{n} opens',

    'ov.days': 'Days tracked',
    'ov.sites': 'Sites',
    'ov.pages': 'Pages',
    'ov.opens': 'Opens',
    'ov.peak': 'Peak hour',
    'ov.perPage': 'Avg per page',
    'ov.daysVal': '{n} days',
    'ov.dayVal': '{n} day',
    'ov.sitesVal': '{n}',
    'ov.pagesVal': '{n}',
    'ov.opensVal': '{n}',

    'dash.empty': 'No data',
    'dash.more': '{n} more pages…',
    'dash.visits': '{n} visits',
    'dash.visitOne': '{n} visit',
    'dash.hourTip': '{h}:00–{h2}:00 · {v}',
    'dash.footReal': 'Source: local extension storage (storage.local), most recent 90 days kept',
    'dash.footDemo': 'Preview mode · Showing sample data. Install the extension to see your real records.',
    'dash.noExport': 'No real data to export in preview mode. Install the extension first.'
  };

  var CAT_EN = {
    '开发': 'Development',
    '学习': 'Learning',
    '视频': 'Video',
    '社交': 'Social',
    '购物': 'Shopping',
    '资讯': 'News',
    '邮箱': 'Email',
    '工具': 'Tools',
    '其他': 'Other'
  };

  var lang = DEFAULT;
  var subs = [];

  function table() { return lang === 'en' ? EN : ZH; }

  function t(key, vars) {
    var s = table()[key];
    if (s === undefined) s = ZH[key];
    if (s === undefined) return key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.split('{' + k + '}').join(String(vars[k]));
      });
    }
    return s;
  }

  function catName(cat) {
    if (lang !== 'en') return cat;
    return CAT_EN[cat] || cat;
  }

  function fmt(ms) {
    var s = Math.round((ms || 0) / 1000);
    if (lang === 'en') {
      if (s < 60) return s + 's';
      var em = Math.floor(s / 60);
      if (em < 60) return em + 'm';
      var eh = Math.floor(em / 60);
      var erm = em % 60;
      return erm ? eh + 'h ' + erm + 'm' : eh + 'h';
    }
    if (s < 60) return s + ' 秒';
    var m = Math.floor(s / 60);
    if (m < 60) return m + ' 分钟';
    var h = Math.floor(m / 60);
    var rm = m % 60;
    return rm ? h + ' 小时 ' + rm + ' 分' : h + ' 小时';
  }

  function readCache() {
    try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; }
  }

  function writeCache(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  function normalize(v) { return v === 'en' ? 'en' : 'zh'; }

  function queryLang() {
    try {
      var m = /[?&]lang=(en|zh)(&|$)/.exec(location.search || '');
      return m ? m[1] : '';
    } catch (e) { return ''; }
  }

  function storageGet(cb) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(KEY, function (o) {
          cb(o && o[KEY]);
        });
        return;
      }
    } catch (e) {}
    cb(undefined);
  }

  function storageSet(v) {
    var o = {};
    o[KEY] = v;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(o);
      }
    } catch (e) {}
  }

  function applyDom(root) {
    var r = root || document;
    var i, e;

    var nodes = r.querySelectorAll('[data-i18n]');
    for (i = 0; i < nodes.length; i++) {
      e = nodes[i];
      e.textContent = t(e.getAttribute('data-i18n'));
    }

    var holder = r.querySelectorAll('[data-i18n-attr]');
    for (i = 0; i < holder.length; i++) {
      e = holder[i];
      var spec = e.getAttribute('data-i18n-attr').split(':');
      if (spec.length === 2) e.setAttribute(spec[0], t(spec[1]));
    }

    if (document.documentElement) {
      document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN');
    }
  }

  function fire() {
    subs.forEach(function (fn) {
      try { fn(lang); } catch (err) {}
    });
  }

  function setLang(v) {
    var next = normalize(v);
    if (next === lang) return;
    lang = next;
    writeCache(lang);
    storageSet(lang);
    applyDom();
    fire();
  }

  function toggle() { setLang(lang === 'en' ? 'zh' : 'en'); }

  function onChange(fn) { if (typeof fn === 'function') subs.push(fn); }

  function watch() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener(function (changes, area) {
          if (area !== 'local' || !changes[KEY]) return;
          var next = normalize(changes[KEY].newValue);
          if (next === lang) return;
          lang = next;
          writeCache(lang);
          applyDom();
          fire();
        });
      }
    } catch (e) {}
  }

  function load(done) {
    var q = queryLang();
    if (q) {
      lang = q;
      applyDom();
      if (typeof done === 'function') done(lang);
      return;
    }

    var cached = readCache();
    if (cached) lang = normalize(cached);

    storageGet(function (stored) {
      if (stored !== undefined && stored !== null && stored !== '') lang = normalize(stored);
      applyDom();
      if (typeof done === 'function') done(lang);
    });
  }

  g.TTi18n = {
    KEY: KEY,
    t: t,
    fmt: fmt,
    catName: catName,
    lang: function () { return lang; },
    setLang: setLang,
    toggle: toggle,
    load: load,
    watch: watch,
    applyDom: applyDom,
    onChange: onChange
  };
})(typeof self !== 'undefined' ? self : this);
