(function (g) {
  'use strict';

  var RULES = [
    { cat: '开发', hosts: ['github.com', 'gitlab.com', 'gitee.com', 'stackoverflow.com', 'developer.mozilla.org', 'npmjs.com', 'pypi.org', 'csdn.net', 'juejin.cn', 'cnblogs.com', 'leetcode.cn', 'chatgpt.com', 'claude.ai', 'cursor.sh', 'vercel.com', 'cloudflare.com', 'segmentfault.com', 'oschina.net'] },
    { cat: '学习', hosts: ['coursera.org', 'icourse163.org', 'xuetangx.com', 'wikipedia.org', 'zh.wikipedia.org', 'khanacademy.org', 'britannica.com', '51job.com', 'gaokao.com'] },
    { cat: '视频', hosts: ['bilibili.com', 'b23.tv', 'youtube.com', 'iqiyi.com', 'youku.com', 'v.qq.com', 'douyin.com', 'netflix.com', 'twitch.tv', 'mgtv.com'] },
    { cat: '社交', hosts: ['weibo.com', 'zhihu.com', 'douban.com', 'tieba.baidu.com', 'xiaohongshu.com', 'facebook.com', 'x.com', 'twitter.com', 'reddit.com', 'instagram.com', 'linkedin.com'] },
    { cat: '购物', hosts: ['taobao.com', 'tmall.com', 'jd.com', 'pinduoduo.com', 'amazon.com', 'amazon.cn', 'suning.com', 'smzdm.com', '1688.com'] },
    { cat: '资讯', hosts: ['news.qq.com', 'news.sina.com.cn', 'toutiao.com', 'thepaper.cn', '36kr.com', 'sspai.com', 'huxiu.com', 'caixin.com', 'eastmoney.com', 'xueqiu.com'] },
    { cat: '邮箱', hosts: ['mail.qq.com', 'mail.163.com', 'mail.google.com', 'outlook.live.com', 'outlook.office.com', 'feishu.cn', 'dingtalk.com', 'work.weixin.qq.com'] },
    { cat: '工具', hosts: ['docs.qq.com', 'docs.google.com', 'notion.so', 'yuque.com', 'processon.com', 'figma.com', 'translate.google.com', 'fanyi.baidu.com', 'map.baidu.com', 'amap.com'] }
  ];

  var HOST_MAP = {};
  RULES.forEach(function (r) {
    r.hosts.forEach(function (h) { HOST_MAP[h] = r.cat; });
  });

  var CATEGORIES = ['开发', '学习', '视频', '社交', '购物', '资讯', '邮箱', '工具', '其他'];

  var COLORS = {
    '开发': '#2563eb',
    '学习': '#7c3aed',
    '视频': '#db2777',
    '社交': '#0891b2',
    '购物': '#ea580c',
    '资讯': '#65a30d',
    '邮箱': '#4f46e5',
    '工具': '#0d9488',
    '其他': '#94a3b8'
  };

  function classify(host, customMap) {
    if (!host) return '其他';
    if (customMap && customMap[host]) return customMap[host];
    if (HOST_MAP[host]) return HOST_MAP[host];
    var parts = host.split('.');
    if (parts.length > 2) {
      var root = parts.slice(-2).join('.');
      if (HOST_MAP[root]) return HOST_MAP[root];
      // www. / m. / wap. 等前缀剥离后重试
      var noSub = parts.slice(1).join('.');
      if (HOST_MAP[noSub]) return HOST_MAP[noSub];
    }
    return '其他';
  }

  function colorOf(cat) {
    return COLORS[cat] || COLORS['其他'];
  }

  function hostOf(key) {
    var i = key.indexOf('/');
    return i === -1 ? key : key.slice(0, i);
  }

  g.TTCat = {
    classify: classify,
    colorOf: colorOf,
    hostOf: hostOf,
    CATEGORIES: CATEGORIES,
    COLORS: COLORS
  };
})(typeof self !== 'undefined' ? self : this);
