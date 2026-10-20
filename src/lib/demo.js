(function (g) {
  'use strict';

  var DAY_MS = 86400000;

  var POOL = [
    ['github.com', '开发', 'explore', 'GitHub · Where software is built', 74],
    ['chatgpt.com', '开发', '', 'ChatGPT', 58],
    ['juejin.cn', '开发', 'frontend', '掘金 · 前端', 41],
    ['developer.mozilla.org', '开发', 'zh-CN/docs/Web', 'MDN Web Docs', 33],
    ['csdn.net', '开发', 'nav', 'CSDN 博客', 26],
    ['bilibili.com', '视频', 'video/BV1xx411c7mD', '【4K】某纪录片', 96],
    ['b23.tv', '视频', '', 'b23.tv 短链', 18],
    ['zhihu.com', '社交', 'question/19551677', '如何评价某技术方案？', 47],
    ['weibo.com', '社交', 'hot', '微博热搜', 22],
    ['xiaohongshu.com', '社交', 'explore', '小红书', 31],
    ['docs.qq.com', '工具', 'doc/DZFVxx', '项目需求文档', 52],
    ['notion.so', '工具', 'workspace', 'Notion · 工作区', 28],
    ['news.qq.com', '资讯', 'tech', '腾讯科技', 19],
    ['36kr.com', '资讯', '', '36氪', 24],
    ['taobao.com', '购物', 'cart', '购物车', 14],
    ['jd.com', '购物', '', '京东', 11],
    ['mail.qq.com', '邮箱', '', 'QQ邮箱', 16],
    ['coursera.org', '学习', 'learn/programming', 'Coursera · 课程', 27]
  ];

  var HOUR_WEIGHT = [0.2, 0.1, 0.05, 0.05, 0.1, 0.2, 0.5, 1.0, 1.4, 1.6, 1.7, 1.2, 0.9, 1.5, 1.8, 1.9, 1.7, 1.2, 1.0, 1.2, 1.6, 1.8, 1.5, 0.8];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function offsetOf(key) {
    var p = String(key).split('-');
    if (p.length !== 3) return null;
    var target = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])).getTime();
    var t = new Date();
    var today = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
    var off = Math.round((target - today) / DAY_MS);
    if (off > 0 || off < -60) return null;
    return off;
  }

  function makeDay(offset) {
    var seed = (20261004 + offset * 7919) >>> 0;
    function rnd() {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    }

    var decay = 1 - Math.abs(offset) * 0.012;
    var pages = {};
    var total = 0;

    POOL.forEach(function (it) {
      var mins = Math.round(it[4] * (0.55 + rnd() * 0.85) * decay);
      if (offset !== 0) mins = Math.round(mins * 0.86);
      if (mins <= 0) return;
      var ms = mins * 60000;
      var path = it[2] ? '/' + it[2] : '';
      var key = it[0] + path;
      pages[key] = {
        host: it[0],
        path: path,
        title: it[3],
        cat: it[1],
        ms: ms,
        visits: 1 + Math.floor(rnd() * 5),
        first: 0,
        last: 0
      };
      total += ms;
    });

    var wsum = HOUR_WEIGHT.reduce(function (a, b) { return a + b; }, 0);
    var hours = HOUR_WEIGHT.map(function (w) { return Math.round(total * w / wsum); });

    return { pages: pages, hours: hours, total: total, demo: true };
  }

  function get(keys) {
    var out = {};
    if (keys === null || keys === undefined) {
      var tk = todayKey();
      out['day:' + tk] = makeDay(0);
      return out;
    }
    if (typeof keys === 'string') keys = [keys];
    keys.forEach(function (k) {
      if (String(k).indexOf('day:') !== 0) return;
      var off = offsetOf(String(k).slice(4));
      if (off === null) return;
      out[k] = makeDay(off);
    });
    return out;
  }

  g.TTDemo = { get: get, makeDay: makeDay, todayKey: todayKey };
})(typeof self !== 'undefined' ? self : this);
