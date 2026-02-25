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
});
