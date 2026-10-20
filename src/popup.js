(function () {
  'use strict';

  var T = TTi18n;

  var elTotal = document.getElementById('total');
  var elLive = document.getElementById('live');
  var elLiveText = document.getElementById('liveText');
  var elLiveTime = document.getElementById('liveTime');
  var elList = document.getElementById('list');
  var elCount = document.getElementById('count');
  var btnOpen = document.getElementById('open');
  var btnPause = document.getElementById('pause');
  var btnLang = document.getElementById('langSw');

  var busy = false;

  function send(msg) {
    return new Promise(function (resolve) {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        resolve(null);
        return;
      }
      try {
        chrome.runtime.sendMessage(msg, function (res) {
          if (chrome.runtime.lastError) { resolve(null); return; }
          resolve(res || null);
        });
      } catch (e) { resolve(null); }
    });
  }

  function buildRow(label, msText, pct, color, visits) {
    var wrap = document.createElement('div');

    var head = document.createElement('div');
    head.className = 'row-head';

    var name = document.createElement('span');
    name.className = 'row-name';
    name.textContent = label;
    name.setAttribute('title', label);

    if (visits) {
      var v = document.createElement('span');
      v.className = 'site-visits';
      v.textContent = T.t('popup.visits', { n: visits });
      head.appendChild(v);
    }

    var val = document.createElement('span');
    val.className = 'row-val';
    val.textContent = msText;

    head.appendChild(name);
    head.appendChild(val);

    var bar = document.createElement('div');
    bar.className = 'bar';
    var fill = document.createElement('i');
    fill.style.width = Math.max(2, Math.min(100, pct)) + '%';
    fill.style.background = color;
    bar.appendChild(fill);

    wrap.appendChild(head);
    wrap.appendChild(bar);
    return wrap;
  }

  function renderBody(hosts) {
    elList.textContent = '';
    if (!hosts || !hosts.length) {
      var e = document.createElement('div');
      e.className = 'empty';
      e.textContent = T.t('popup.empty');
      elList.appendChild(e);
      elCount.textContent = '';
      return;
    }
    elCount.textContent = T.t('popup.siteCount', { n: hosts.length });
    var max = hosts[0].ms || 1;
    hosts.slice(0, 10).forEach(function (h) {
      elList.appendChild(buildRow(h.host, T.fmt(h.ms), h.ms / max * 100, TTCat.colorOf(h.cat), h.visits));
    });
  }

  function renderLive(st) {
    if (!st) {
      elLive.className = 'p-live paused';
      elLiveText.textContent = T.t('popup.preview');
      elLiveTime.textContent = '';
      return;
    }
    if (st.paused) {
      elLive.className = 'p-live paused';
      elLiveText.textContent = T.t('popup.paused');
      elLiveTime.textContent = '';
      return;
    }
    if (st.counting && st.cur) {
      elLive.className = 'p-live on';
      var t = st.cur.title || st.cur.host;
      elLiveText.textContent = t;
      elLiveText.setAttribute('title', t);
      elLiveTime.textContent = TT.fmtClock(st.cur.ms);
      return;
    }
    elLive.className = 'p-live';
    elLiveText.textContent = T.t('popup.idle');
    elLiveTime.textContent = '';
  }

  async function refresh() {
    if (busy) return;
    busy = true;
    try {
      var st = await send({ type: 'status' });

      if (st && st.ok) {
        elTotal.textContent = T.fmt(st.total);
        renderLive(st);
        renderBody(st.hosts);
        btnPause.textContent = st.paused ? T.t('btn.resume') : T.t('btn.pause');
        btnPause.disabled = false;
      } else {
        var day = await TT.readDay(TT.dateKey(Date.now()));
        var s = TT.summarize(day);
        elTotal.textContent = T.fmt(s.total);
        renderLive(null);
        renderBody(s.hosts);
        btnPause.textContent = T.t('btn.pause');
        btnPause.disabled = true;
      }
    } finally {
      busy = false;
    }
  }

  function syncLangUi() {
    document.title = T.t('doc.popup');
    btnLang.textContent = T.lang() === 'en' ? '中' : 'EN';
  }

  btnLang.addEventListener('click', function () {
    T.toggle();
  });

  T.onChange(function () {
    syncLangUi();
    refresh();
  });

  btnOpen.addEventListener('click', function () {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('dashboard.html', '_blank');
    }
  });

  btnPause.addEventListener('click', async function () {
    await send({ type: 'togglePause' });
    await refresh();
  });

  T.load(function () {
    syncLangUi();
    T.watch();
    refresh();
  });

  setInterval(refresh, 2000);
})();
