(function () {
  'use strict';

  var T = TTi18n;

  var elCards = document.getElementById('cards');
  var elHours = document.getElementById('hours');
  var elHourAxis = document.getElementById('hourAxis');
  var elCats = document.getElementById('cats');
  var elOverview = document.getElementById('overview');
  var elSites = document.getElementById('sites');
  var elSub = document.getElementById('subtitle');
  var elFoot = document.getElementById('foot');
  var btnExport = document.getElementById('export');
  var btnLang = document.getElementById('langSw');
  var rangeBtns = document.querySelectorAll('[data-range]');

  var RANGE = 1;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function addCard(label, val, note, small) {
    var c = el('div', 'card');
    c.appendChild(el('div', 'card-label', label));
    var v = el('div', 'card-val', val);
    if (small) {
      v.style.fontSize = '15px';
      v.style.overflow = 'hidden';
      v.style.textOverflow = 'ellipsis';
      v.style.whiteSpace = 'nowrap';
      v.setAttribute('title', val);
    }
    c.appendChild(v);
    c.appendChild(el('div', 'card-note', note || ''));
    elCards.appendChild(c);
  }

  function addLine(label, value) {
    var row = el('div', 'cat-row');
    var n = el('span', 'cat-name', label);
    n.style.width = T.lang() === 'en' ? '96px' : '76px';
    n.style.color = '#5f6672';
    row.appendChild(n);
    var v = el('span', 'cat-val', value);
    v.style.width = 'auto';
    v.style.marginLeft = 'auto';
    v.style.color = '#1f2329';
    row.appendChild(v);
    elOverview.appendChild(row);
  }

  function renderCards(s, days) {
    elCards.textContent = '';
    var pageCount = 0;
    var visits = 0;
    s.hosts.forEach(function (h) {
      pageCount += h.pages.length;
      visits += h.visits;
    });

    addCard(T.t('card.total'), T.fmt(s.total), days > 1 ? T.t('card.days', { n: days }) : T.t('card.today'));
    addCard(T.t('card.avg'), T.fmt(s.total / days), days > 1 ? T.t('card.avgNote') : '');
    addCard(T.t('card.top'), s.hosts[0] ? s.hosts[0].host : '—',
      s.hosts[0] ? T.fmt(s.hosts[0].ms) : T.t('card.noRecord'), true);
    addCard(T.t('card.sitesPages'), s.hosts.length + ' / ' + pageCount, T.t('card.opens', { n: visits }));
  }

  function renderHours(hours) {
    elHours.textContent = '';
    elHourAxis.textContent = '';
    var max = Math.max.apply(null, hours.concat([1]));
    var peak = max * 0.72;

    for (var i = 0; i < 24; i++) {
      var col = el('div', 'hour-col');
      var b = el('div', 'hour-bar' + (hours[i] >= peak && hours[i] > 0 ? ' peak' : ''));
      b.style.height = Math.max(2, Math.round(hours[i] / max * 86)) + 'px';
      b.setAttribute('title', T.t('dash.hourTip', { h: i, h2: (i + 1) % 24, v: T.fmt(hours[i]) }));
      col.appendChild(b);
      elHours.appendChild(col);

      var ax = el('span', '', (i % 3 === 0) ? String(i) : '');
      elHourAxis.appendChild(ax);
    }
  }

  function renderCats(s) {
    elCats.textContent = '';
    var entries = Object.keys(s.byCat)
      .map(function (k) { return { cat: k, ms: s.byCat[k] }; })
      .filter(function (e) { return e.ms > 0; })
      .sort(function (a, b) { return b.ms - a.ms; });

    if (!entries.length) {
      elCats.appendChild(el('div', 'empty', T.t('dash.empty')));
      return;
    }

    var max = entries[0].ms;
    var total = s.total || 1;

    entries.forEach(function (e) {
      var color = TTCat.colorOf(e.cat);
      var row = el('div', 'cat-row');

      var dot = el('span', 'cat-dot');
      dot.style.background = color;
      row.appendChild(dot);
      row.appendChild(el('span', 'cat-name', T.catName(e.cat)));

      var bar = el('div', 'cat-bar');
      var fill = el('i');
      fill.style.width = Math.max(2, e.ms / max * 100) + '%';
      fill.style.background = color;
      bar.appendChild(fill);
      row.appendChild(bar);

      row.appendChild(el('span', 'cat-val', T.fmt(e.ms)));
      row.appendChild(el('span', 'cat-pct', Math.round(e.ms / total * 100) + '%'));
      elCats.appendChild(row);
    });
  }

  function renderOverview(s, days) {
    elOverview.textContent = '';
    var pageCount = 0;
    var visits = 0;
    s.hosts.forEach(function (h) {
      pageCount += h.pages.length;
      visits += h.visits;
    });

    var best = 0;
    s.hours.forEach(function (v, i) { if (v > s.hours[best]) best = i; });

    addLine(T.t('ov.days'), T.t(days === 1 ? 'ov.dayVal' : 'ov.daysVal', { n: days }));
    addLine(T.t('ov.sites'), T.t('ov.sitesVal', { n: s.hosts.length }));
    addLine(T.t('ov.pages'), T.t('ov.pagesVal', { n: pageCount }));
    addLine(T.t('ov.opens'), T.t('ov.opensVal', { n: visits }));
    addLine(T.t('ov.peak'), s.total > 0 ? (best + ':00 - ' + ((best + 1) % 24) + ':00') : '—');
    addLine(T.t('ov.perPage'), visits ? T.fmt(s.total / visits) : '—');
  }

  function renderSites(s) {
    elSites.textContent = '';
    if (!s.hosts.length) {
      elSites.appendChild(el('div', 'empty', T.t('dash.empty')));
      return;
    }

    var max = s.hosts[0].ms || 1;

    s.hosts.slice(0, 15).forEach(function (h) {
      var color = TTCat.colorOf(h.cat);
      var block = el('div', 'site-block');

      var head = el('div', 'site-head');
      head.appendChild(el('span', 'site-name', h.host));

      var cat = el('span', 'site-cat', T.catName(h.cat));
      cat.style.color = color;
      cat.style.background = 'transparent';
      cat.style.border = '1px solid ' + color + '55';
      head.appendChild(cat);

      head.appendChild(el('span', 'site-visits', T.t(h.visits === 1 ? 'dash.visitOne' : 'dash.visits', { n: h.visits })));
      head.appendChild(el('span', 'site-val', T.fmt(h.ms)));
      block.appendChild(head);

      var bar = el('div', 'bar');
      var fill = el('i');
      fill.style.width = Math.max(2, h.ms / max * 100) + '%';
      fill.style.background = color;
      bar.appendChild(fill);
      block.appendChild(bar);

      if (h.pages.length > 1) {
        var pages = el('div', 'site-pages');
        h.pages.slice(0, 3).forEach(function (p) {
          var line = el('div', 'page-line');
          var t = el('span', 'page-title', p.title || p.path || h.host);
          t.setAttribute('title', (p.title || h.host) + '  ' + (p.path || ''));
          line.appendChild(t);
          line.appendChild(el('span', 'page-val', T.fmt(p.ms)));
          pages.appendChild(line);
        });
        if (h.pages.length > 3) {
          pages.appendChild(el('div', 'page-line', T.t('dash.more', { n: h.pages.length - 3 })));
        }
        block.appendChild(pages);
      }

      elSites.appendChild(block);
    });
  }

  function rangeKey() {
    if (RANGE === 7) return 'dash.range.7';
    if (RANGE === 30) return 'dash.range.30';
    return 'dash.range.today';
  }

  async function load() {
    var end = TT.dateKey(Date.now());
    var r = await TT.readRange(end, RANGE);
    var merged = TT.mergeDays(r.days);
    var s = TT.summarize(merged);

    renderCards(s, RANGE);
    renderHours(s.hours);
    renderCats(s);
    renderOverview(s, RANGE);
    renderSites(s);

    elSub.textContent = T.t('dash.rangeLine', { r: T.t(rangeKey()) });
    elFoot.textContent = TT.hasChrome ? T.t('dash.footReal') : T.t('dash.footDemo');
  }

  function syncLangUi() {
    document.title = T.t('doc.dash');
    btnLang.textContent = T.lang() === 'en' ? '中' : 'EN';
  }

  btnLang.addEventListener('click', function () {
    T.toggle();
  });

  T.onChange(function () {
    syncLangUi();
    load();
  });

  Array.prototype.forEach.call(rangeBtns, function (btn) {
    btn.addEventListener('click', function () {
      Array.prototype.forEach.call(rangeBtns, function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      RANGE = Number(btn.getAttribute('data-range')) || 1;
      load();
    });
  });

  btnExport.addEventListener('click', function () {
    if (!TT.hasChrome) {
      alert(T.t('dash.noExport'));
      return;
    }
    chrome.storage.local.get(null, function (all) {
      var out = {};
      Object.keys(all || {}).filter(function (k) {
        return k.indexOf('day:') === 0;
      }).forEach(function (k) {
        out[k.slice(4)] = all[k];
      });
      var blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'web-time-' + TT.dateKey(Date.now()) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  });

  T.load(function () {
    syncLangUi();
    T.watch();
    load();
  });
})();
