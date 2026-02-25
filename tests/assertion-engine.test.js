const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('../src/assertion-engine');

// Mock Playwright page object
function mockPage(overrides = {}) {
  return {
    $: overrides.$ ?? (async () => null),
    $$: overrides.$$ ?? (async () => []),
    isVisible: overrides.isVisible ?? (async () => false),
    textContent: overrides.textContent ?? (async () => null),
    title: overrides.title ?? (async () => ''),
    url: overrides.url ?? (() => 'http://localhost:3000/'),
    getAttribute: overrides.getAttribute ?? (async () => null),
  };
}

describe('assertion-engine.evaluate', () => {
  // ── element-exists ──────────────────────────────────

  describe('element-exists', () => {
    it('passes when element is found', async () => {
      const page = mockPage({ $: async () => ({}) });
      const result = await evaluate(page, { type: 'element-exists', selector: 'h1' });
      assert.equal(result.status, 'passed');
      assert.match(result.message, /element-exists/);
    });

    it('fails when element is not found', async () => {
      const page = mockPage({ $: async () => null });
      const result = await evaluate(page, { type: 'element-exists', selector: '.missing' });
      assert.equal(result.status, 'failed');
      assert.match(result.message, /not found/);
    });
  });

  // ── element-not-exists ──────────────────────────────

  describe('element-not-exists', () => {
    it('passes when element is not found', async () => {
      const page = mockPage({ $: async () => null });
      const result = await evaluate(page, { type: 'element-not-exists', selector: '.error' });
      assert.equal(result.status, 'passed');
    });

    it('fails when element is found', async () => {
      const page = mockPage({ $: async () => ({}) });
      const result = await evaluate(page, { type: 'element-not-exists', selector: '.error' });
      assert.equal(result.status, 'failed');
      assert.match(result.message, /was found/);
    });
  });

  // ── element-visible ─────────────────────────────────

  describe('element-visible', () => {
    it('passes when element is visible', async () => {
      const page = mockPage({ isVisible: async () => true });
      const result = await evaluate(page, { type: 'element-visible', selector: '.hero' });
      assert.equal(result.status, 'passed');
    });

    it('fails when element is not visible', async () => {
      const page = mockPage({ isVisible: async () => false });
      const result = await evaluate(page, { type: 'element-visible', selector: '.hero' });
      assert.equal(result.status, 'failed');
      assert.match(result.message, /not visible/);
    });
  });

  // ── text-contains ───────────────────────────────────

  describe('text-contains', () => {
    it('passes when text includes expected substring', async () => {
      const page = mockPage({ textContent: async () => 'Welcome to the App' });
      const result = await evaluate(page, { type: 'text-contains', selector: 'h1', expected: 'Welcome' });
      assert.equal(result.status, 'passed');
    });

    it('fails when text does not include expected', async () => {
      const page = mockPage({ textContent: async () => 'Goodbye' });
      const result = await evaluate(page, { type: 'text-contains', selector: 'h1', expected: 'Hello' });
      assert.equal(result.status, 'failed');
      assert.match(result.message, /expected to contain "Hello"/);
    });

    it('fails when element returns null text', async () => {
      const page = mockPage({ textContent: async () => null });
      const result = await evaluate(page, { type: 'text-contains', selector: 'h1', expected: 'x' });
      assert.equal(result.status, 'failed');
    });
  });

  // ── text-equals ─────────────────────────────────────

  describe('text-equals', () => {
    it('passes when trimmed text exactly matches', async () => {
      const page = mockPage({ textContent: async () => '  Dashboard  ' });
      const result = await evaluate(page, { type: 'text-equals', selector: '.title', expected: 'Dashboard' });
      assert.equal(result.status, 'passed');
    });

    it('fails when text does not match', async () => {
      const page = mockPage({ textContent: async () => 'Home' });
      const result = await evaluate(page, { type: 'text-equals', selector: '.title', expected: 'Dashboard' });
      assert.equal(result.status, 'failed');
    });
  });

  // ── url-matches ─────────────────────────────────────

  describe('url-matches', () => {
    it('passes when URL contains expected string', async () => {
      const page = mockPage({ url: () => 'http://localhost:3000/dashboard?tab=1' });
      const result = await evaluate(page, { type: 'url-matches', expected: '/dashboard' });
      assert.equal(result.status, 'passed');
    });

    it('fails when URL does not contain expected', async () => {
      const page = mockPage({ url: () => 'http://localhost:3000/login' });
      const result = await evaluate(page, { type: 'url-matches', expected: '/dashboard' });
      assert.equal(result.status, 'failed');
    });
  });

  // ── title-contains ──────────────────────────────────

  describe('title-contains', () => {
    it('passes when title includes expected string', async () => {
      const page = mockPage({ title: async () => 'My App - Dashboard' });
      const result = await evaluate(page, { type: 'title-contains', expected: 'My App' });
      assert.equal(result.status, 'passed');
    });

    it('fails when title does not include expected', async () => {
      const page = mockPage({ title: async () => 'Other Page' });
      const result = await evaluate(page, { type: 'title-contains', expected: 'My App' });
      assert.equal(result.status, 'failed');
    });
  });

  // ── attribute-equals ────────────────────────────────

  describe('attribute-equals', () => {
    it('passes when attribute matches', async () => {
      const page = mockPage({ getAttribute: async () => 'Company Logo' });
      const result = await evaluate(page, {
        type: 'attribute-equals', selector: 'img', attribute: 'alt', expected: 'Company Logo',
      });
      assert.equal(result.status, 'passed');
    });

    it('fails when attribute does not match', async () => {
      const page = mockPage({ getAttribute: async () => 'Other Logo' });
      const result = await evaluate(page, {
        type: 'attribute-equals', selector: 'img', attribute: 'alt', expected: 'Company Logo',
      });
      assert.equal(result.status, 'failed');
    });
  });

  // ── element-count ───────────────────────────────────

  describe('element-count', () => {
    it('passes when count matches expected', async () => {
      const page = mockPage({ $$: async () => [{}, {}, {}] });
      const result = await evaluate(page, { type: 'element-count', selector: 'li', expected: 3 });
      assert.equal(result.status, 'passed');
    });

    it('fails when count does not match', async () => {
      const page = mockPage({ $$: async () => [{}] });
      const result = await evaluate(page, { type: 'element-count', selector: 'li', expected: 3 });
      assert.equal(result.status, 'failed');
      assert.match(result.message, /expected 3 elements but found 1/);
    });
  });

  // ── Error handling ──────────────────────────────────

  describe('error handling', () => {
    it('returns failed status on unknown assertion type', async () => {
      const page = mockPage();
      const result = await evaluate(page, { type: 'custom-check' });
      assert.equal(result.status, 'failed');
      assert.match(result.message, /Unknown assertion type/);
    });

    it('catches exceptions and returns failed', async () => {
      const page = mockPage({ $: async () => { throw new Error('Page crashed'); } });
      const result = await evaluate(page, { type: 'element-exists', selector: 'h1' });
      assert.equal(result.status, 'failed');
      assert.match(result.message, /Page crashed/);
    });
  });
});
