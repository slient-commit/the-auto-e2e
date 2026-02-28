const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execute } = require('../src/action-executor');

// Mock Playwright page that records method calls
function mockPage() {
  const calls = [];
  return {
    calls,
    click: async (sel) => calls.push({ method: 'click', args: [sel] }),
    fill: async (sel, val) => calls.push({ method: 'fill', args: [sel, val] }),
    hover: async (sel) => calls.push({ method: 'hover', args: [sel] }),
    selectOption: async (sel, val) => calls.push({ method: 'selectOption', args: [sel, val] }),
    locator: (sel) => ({
      scrollIntoViewIfNeeded: async () => calls.push({ method: 'scrollIntoViewIfNeeded', args: [sel] }),
    }),
    waitForTimeout: async (ms) => calls.push({ method: 'waitForTimeout', args: [ms] }),
    waitForSelector: async (sel, opts) => calls.push({ method: 'waitForSelector', args: [sel, opts] }),
    waitForLoadState: async (state) => calls.push({ method: 'waitForLoadState', args: [state] }),
    press: async (sel, key) => calls.push({ method: 'press', args: [sel, key] }),
  };
}

describe('action-executor.execute', () => {
  it('delegates click to page.click', async () => {
    const page = mockPage();
    await execute(page, { action: 'click', selector: '#btn' });
    assert.equal(page.calls.length, 1);
    assert.equal(page.calls[0].method, 'click');
    assert.deepEqual(page.calls[0].args, ['#btn']);
  });

  it('delegates type to page.fill', async () => {
    const page = mockPage();
    await execute(page, { action: 'type', selector: '#email', value: 'test@example.com' });
    assert.equal(page.calls[0].method, 'fill');
    assert.deepEqual(page.calls[0].args, ['#email', 'test@example.com']);
  });

  it('converts numeric value to string for type', async () => {
    const page = mockPage();
    await execute(page, { action: 'type', selector: '#age', value: 25 });
    assert.deepEqual(page.calls[0].args, ['#age', '25']);
  });

  it('delegates hover to page.hover', async () => {
    const page = mockPage();
    await execute(page, { action: 'hover', selector: '.tooltip' });
    assert.equal(page.calls[0].method, 'hover');
  });

  it('delegates select to page.selectOption', async () => {
    const page = mockPage();
    await execute(page, { action: 'select', selector: '#lang', value: 'fr' });
    assert.equal(page.calls[0].method, 'selectOption');
    assert.deepEqual(page.calls[0].args, ['#lang', 'fr']);
  });

  it('delegates scroll to locator.scrollIntoViewIfNeeded', async () => {
    const page = mockPage();
    await execute(page, { action: 'scroll', selector: 'footer' });
    assert.equal(page.calls[0].method, 'scrollIntoViewIfNeeded');
  });

  it('delegates wait to page.waitForTimeout', async () => {
    const page = mockPage();
    await execute(page, { action: 'wait', timeout: 2000 });
    assert.equal(page.calls[0].method, 'waitForTimeout');
    assert.deepEqual(page.calls[0].args, [2000]);
  });

  it('delegates wait-for-selector to page.waitForSelector', async () => {
    const page = mockPage();
    await execute(page, { action: 'wait-for-selector', selector: '.loaded', timeout: 3000 });
    assert.equal(page.calls[0].method, 'waitForSelector');
    assert.deepEqual(page.calls[0].args, ['.loaded', { timeout: 3000 }]);
  });

  it('uses default 5000ms timeout for wait-for-selector', async () => {
    const page = mockPage();
    await execute(page, { action: 'wait-for-selector', selector: '.loaded' });
    assert.deepEqual(page.calls[0].args, ['.loaded', { timeout: 5000 }]);
  });

  it('delegates wait-for-navigation to page.waitForLoadState', async () => {
    const page = mockPage();
    await execute(page, { action: 'wait-for-navigation' });
    assert.equal(page.calls[0].method, 'waitForLoadState');
    assert.deepEqual(page.calls[0].args, ['networkidle']);
  });

  it('delegates press to page.press', async () => {
    const page = mockPage();
    await execute(page, { action: 'press', selector: '#search', key: 'Enter' });
    assert.equal(page.calls[0].method, 'press');
    assert.deepEqual(page.calls[0].args, ['#search', 'Enter']);
  });

  it('delegates clear to page.fill with empty string', async () => {
    const page = mockPage();
    await execute(page, { action: 'clear', selector: '#input' });
    assert.equal(page.calls[0].method, 'fill');
    assert.deepEqual(page.calls[0].args, ['#input', '']);
  });

  it('throws on unknown action', async () => {
    const page = mockPage();
    await assert.rejects(
      () => execute(page, { action: 'double-click', selector: '#btn' }),
      /Unknown action: double-click/,
    );
  });

  // ── goto ──────────────────────────────────────────────

  it('delegates goto to page.goto with absolute URL', async () => {
    const page = mockPage();
    page.goto = async (url, opts) => page.calls.push({ method: 'goto', args: [url, opts] });
    await execute(page, { action: 'goto', url: 'http://example.com/page' });
    assert.equal(page.calls[0].method, 'goto');
    assert.equal(page.calls[0].args[0], 'http://example.com/page');
  });

  it('delegates goto with relative path prepends baseUrl', async () => {
    const page = mockPage();
    page.goto = async (url, opts) => page.calls.push({ method: 'goto', args: [url, opts] });
    await execute(page, { action: 'goto', url: '/items/42' }, {}, 'http://localhost:4200');
    assert.equal(page.calls[0].args[0], 'http://localhost:4200/items/42');
  });

  // ── capture-text ──────────────────────────────────────

  it('capture-text stores trimmed text in variables', async () => {
    const page = mockPage();
    page.textContent = async () => '  ABC-123  ';
    const variables = {};
    await execute(page, { action: 'capture-text', selector: '.id', variable: 'myId' }, variables);
    assert.equal(variables.myId, 'ABC-123');
  });

  // ── capture-attribute ─────────────────────────────────

  it('capture-attribute stores attribute value in variables', async () => {
    const page = mockPage();
    page.getAttribute = async () => '/items/99';
    const variables = {};
    await execute(page, { action: 'capture-attribute', selector: 'a', attribute: 'href', variable: 'link' }, variables);
    assert.equal(variables.link, '/items/99');
  });

  // ── capture-url ───────────────────────────────────────

  it('capture-url extracts value with regex pattern', async () => {
    const page = mockPage();
    page.url = () => 'http://localhost:4200/items/42/details';
    const variables = {};
    await execute(page, { action: 'capture-url', pattern: '/items/(\\d+)', variable: 'itemId' }, variables);
    assert.equal(variables.itemId, '42');
  });

  it('capture-url extracts value with named segment pattern', async () => {
    const page = mockPage();
    page.url = () => 'http://localhost:4200/items/99/edit';
    const variables = {};
    await execute(page, { action: 'capture-url', pattern: '/items/:itemId', variable: 'itemId' }, variables);
    assert.equal(variables.itemId, '99');
  });

  it('capture-url throws when pattern does not match', async () => {
    const page = mockPage();
    page.url = () => 'http://localhost:4200/dashboard';
    await assert.rejects(
      () => execute(page, { action: 'capture-url', pattern: '/items/(\\d+)', variable: 'id' }, {}),
      /did not match URL/,
    );
  });

  // ── variable interpolation ────────────────────────────

  it('interpolates variables in type action value', async () => {
    const page = mockPage();
    const variables = { itemId: '42' };
    await execute(page, { action: 'type', selector: '#field', value: 'ID: {{itemId}}' }, variables);
    assert.deepEqual(page.calls[0].args, ['#field', 'ID: 42']);
  });

  it('interpolates variables in goto url', async () => {
    const page = mockPage();
    page.goto = async (url, opts) => page.calls.push({ method: 'goto', args: [url, opts] });
    const variables = { id: '55' };
    await execute(page, { action: 'goto', url: '/items/{{id}}/edit' }, variables, 'http://localhost:4200');
    assert.equal(page.calls[0].args[0], 'http://localhost:4200/items/55/edit');
  });

  it('interpolates variables in selector', async () => {
    const page = mockPage();
    const variables = { idx: '3' };
    await execute(page, { action: 'click', selector: '#row-{{idx}}' }, variables);
    assert.deepEqual(page.calls[0].args, ['#row-3']);
  });
});
