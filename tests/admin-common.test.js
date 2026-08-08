const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

test('admin common exposes the auth helpers globally', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'admin', 'js', 'admin-common.js'), 'utf8');
  const context = {
    window: {},
    document: {
      addEventListener() {},
      createElement() { return { addEventListener() {}, className: '', setAttribute() {}, appendChild() {}, getAttribute() { return ''; } }; },
      body: { appendChild() {} },
      getElementById() { return null; },
      querySelectorAll() { return []; },
    },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    console,
    setTimeout,
    clearTimeout,
  };
  context.global = context;
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(typeof context.AdminAuth.requireAuth, 'function');
  assert.equal(typeof context.adminFetch, 'function');
  assert.equal(typeof context.showToast, 'function');
  assert.equal(typeof context.fmtBDT, 'function');
  assert.equal(typeof context.window.AdminAuth, 'object');
  assert.equal(typeof context.window.adminFetch, 'function');
  assert.equal(typeof context.window.showToast, 'function');
});
