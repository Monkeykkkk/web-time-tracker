const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'src', 'lib', 'i18n.js');

let pass = 0;
let fail = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass++;
    console.log('  PASS  ' + name + '  ->  ' + JSON.stringify(actual));
  } else {
    fail++;
    console.log('  FAIL  ' + name);
    console.log('        期望 ' + JSON.stringify(expected) + '  实际 ' + JSON.stringify(actual));
  }
}

function makeEnv(opts) {
  const store = Object.assign({}, (opts && opts.store) || {});
  const attrs = {};
  const sandbox = {
    console,
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); }
    },
    location: { search: (opts && opts.search) || '' },
    document: {
      querySelectorAll: () => [],
      documentElement: {
        setAttribute: (k, v) => { attrs[k] = v; },
        getAttribute: (k) => attrs[k]
      }
    }
  };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(SRC, 'utf8'), sandbox);
  return { T: sandbox.TTi18n, store, attrs };
}

console.log('--- 1. 默认语言必须是中文 ---');
{
  const { T, store, attrs } = makeEnv();
  let loadedWith = null;
  T.load((l) => { loadedWith = l; });
  check('未设置时 lang()', T.lang(), 'zh');
  check('load 回调参数', loadedWith, 'zh');
  check('中文主标题', T.t('popup.totalLabel'), '今天网页时间');
  check('中文时长格式', T.fmt(3 * 3600 * 1000 + 25 * 60000), '3 小时 25 分');
  check('中文分类名', T.catName('开发'), '开发');
  check('<html lang>', attrs.lang, 'zh-CN');
  check('未写入存储', store['ui:lang'], undefined);
}

console.log('\n--- 2. 切换到英文后文案与格式 ---');
{
  const { T, store, attrs } = makeEnv();
  T.load(() => {});
  T.toggle();
  check('lang()', T.lang(), 'en');
  check('英文主标题', T.t('popup.totalLabel'), 'Web time today');
  check('英文时长（时+分）', T.fmt(3 * 3600 * 1000 + 25 * 60000), '3h 25m');
  check('英文时长（整点）', T.fmt(2 * 3600 * 1000), '2h');
  check('英文时长（分钟）', T.fmt(45 * 60000), '45m');
  check('英文时长（秒）', T.fmt(30 * 1000), '30s');
  check('英文分类名', T.catName('开发'), 'Development');
  check('英文分类名（其他）', T.catName('其他'), 'Other');
  check('分类名未知时兜底', T.catName('自定义'), '自定义');
  check('插值', T.t('popup.siteCount', { n: 18 }), '18 sites');
  check('复数 1 天', T.t('ov.dayVal', { n: 1 }), '1 day');
  check('复数 2 天', T.t('ov.daysVal', { n: 2 }), '2 days');
  check('复数 1 visit', T.t('dash.visitOne', { n: 1 }), '1 visit');
  check('复数 3 visits', T.t('dash.visits', { n: 3 }), '3 visits');
  check('写入存储', store['ui:lang'], 'en');
  check('<html lang> 已更新', attrs.lang, 'en');
}

console.log('\n--- 3. 再切回中文（往返一致性）---');
{
  const { T } = makeEnv();
  T.load(() => {});
  T.toggle();
  T.toggle();
  check('lang()', T.lang(), 'zh');
  check('文案回到中文', T.t('popup.totalLabel'), '今天网页时间');
  check('格式回到中文', T.fmt(45 * 60000), '45 分钟');
  check('分类回到中文', T.catName('开发'), '开发');
}

console.log('\n--- 4. 重启后保持上次选择 ---');
{
  const { T } = makeEnv({ store: { 'ui:lang': 'en' } });
  let loaded = null;
  T.load((l) => { loaded = l; });
  check('load 恢复为英文', loaded, 'en');
  check('文案为英文', T.t('btn.report'), 'Full report');
}

console.log('\n--- 5. 存储值非法时回落到中文 ---');
{
  const { T } = makeEnv({ store: { 'ui:lang': 'fr' } });
  T.load(() => {});
  check('lang()', T.lang(), 'zh');
}

console.log('\n--- 6. onChange 订阅会被触发 ---');
{
  const { T } = makeEnv();
  T.load(() => {});
  const seen = [];
  T.onChange((l) => seen.push(l));
  T.toggle();
  T.toggle();
  check('订阅收到的序列', seen, ['en', 'zh']);
}

console.log('\n--- 7. 重复设置同一语言不重复通知 ---');
{
  const { T } = makeEnv();
  T.load(() => {});
  const seen = [];
  T.onChange((l) => seen.push(l));
  T.setLang('zh');
  T.setLang('en');
  T.setLang('en');
  check('只触发一次', seen, ['en']);
}

console.log('\n--- 8. ?lang=en 覆盖存储值（调试入口）---');
{
  const { T } = makeEnv({ search: '?lang=en', store: { 'ui:lang': 'zh' } });
  T.load(() => {});
  check('URL 参数优先', T.lang(), 'en');
}

console.log('\n========================================');
console.log('共 ' + (pass + fail) + ' 项，通过 ' + pass + '，失败 ' + fail);
process.exit(fail ? 1 : 0);
