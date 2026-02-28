const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('../src/schema');

// Helper: minimal valid config
function validConfig(overrides = {}) {
  return {
    app: { command: 'npm run dev', url: 'http://localhost:4200' },
    tests: [{ name: 'T1', path: '/', assertions: [{ type: 'element-exists', selector: 'h1' }] }],
    ...overrides,
  };
}

describe('schema.validate', () => {
  // ── Happy paths ──────────────────────────────────────────

  it('accepts a minimal valid config', () => {
    assert.doesNotThrow(() => validate(validConfig()));
  });

  it('accepts config with only visualTests', () => {
    const cfg = {
      app: { command: 'npm run dev', url: 'http://localhost:4200' },
      visualTests: [{ name: 'V1', path: '/', baseline: 'home.png' }],
    };
    assert.doesNotThrow(() => validate(cfg));
  });

  it('accepts config with both tests and visualTests', () => {
    const cfg = validConfig({
      visualTests: [{ name: 'V1', path: '/', baseline: 'home.png' }],
    });
    assert.doesNotThrow(() => validate(cfg));
  });

  it('accepts all valid browsers', () => {
    const cfg = validConfig();
    cfg.app.browsers = ['chromium', 'firefox', 'webkit'];
    assert.doesNotThrow(() => validate(cfg));
  });

  it('accepts valid viewport', () => {
    const cfg = validConfig();
    cfg.app.viewport = { width: 1920, height: 1080 };
    assert.doesNotThrow(() => validate(cfg));
  });

  it('accepts all 10 action types with valid params', () => {
    const cfg = validConfig();
    cfg.tests[0].actions = [
      { action: 'click', selector: '#btn' },
      { action: 'type', selector: '#input', value: 'hello' },
      { action: 'hover', selector: '#el' },
      { action: 'select', selector: '#sel', value: 'a' },
      { action: 'scroll', selector: '#foot' },
      { action: 'wait', timeout: 500 },
      { action: 'wait-for-selector', selector: '.loaded' },
      { action: 'wait-for-navigation' },
      { action: 'press', selector: '#search', key: 'Enter' },
      { action: 'clear', selector: '#field' },
    ];
    assert.doesNotThrow(() => validate(cfg));
  });

  it('accepts all 9 assertion types with valid params', () => {
    const cfg = validConfig();
    cfg.tests[0].assertions = [
      { type: 'element-exists', selector: 'h1' },
      { type: 'element-not-exists', selector: '.error' },
      { type: 'element-visible', selector: '.hero' },
      { type: 'text-contains', selector: 'h1', expected: 'Hello' },
      { type: 'text-equals', selector: 'h1', expected: 'Hello' },
      { type: 'url-matches', expected: '/home' },
      { type: 'title-contains', expected: 'App' },
      { type: 'attribute-equals', selector: 'img', attribute: 'alt', expected: 'Logo' },
      { type: 'element-count', selector: 'li', expected: 3 },
    ];
    assert.doesNotThrow(() => validate(cfg));
  });

  it('accepts valid visual test with comparison options', () => {
    const cfg = {
      app: { command: 'npm run dev', url: 'http://localhost:4200' },
      visualTests: [{
        name: 'V1', path: '/', baseline: 'home.png',
        comparison: { mode: 'threshold', maxDiffPercent: 2.5, threshold: 0.2 },
      }],
    };
    assert.doesNotThrow(() => validate(cfg));
  });

  // ── Error paths ──────────────────────────────────────────

  it('rejects null config', () => {
    assert.throws(() => validate(null), /configuration must be an object/);
  });

  it('rejects missing app section', () => {
    assert.throws(() => validate({ tests: [{ name: 'T', path: '/', assertions: [{ type: 'element-exists', selector: 'x' }] }] }), /"app" section is required/);
  });

  it('rejects missing app.command', () => {
    assert.throws(() => validate({ app: { url: 'http://localhost:3000' }, tests: [{ name: 'T', path: '/', assertions: [{ type: 'element-exists', selector: 'x' }] }] }), /app\.command is required/);
  });

  it('rejects missing app.url', () => {
    assert.throws(() => validate({ app: { command: 'npm start' }, tests: [{ name: 'T', path: '/', assertions: [{ type: 'element-exists', selector: 'x' }] }] }), /app\.url is required/);
  });

  it('rejects app.url without http(s)://', () => {
    assert.throws(() => validate({ app: { command: 'npm start', url: 'localhost:3000' }, tests: [{ name: 'T', path: '/', assertions: [{ type: 'element-exists', selector: 'x' }] }] }), /app\.url must start with http/);
  });

  it('rejects invalid browser name', () => {
    const cfg = validConfig();
    cfg.app.browsers = ['opera'];
    assert.throws(() => validate(cfg), /invalid browser "opera"/);
  });

  it('rejects empty browsers array', () => {
    const cfg = validConfig();
    cfg.app.browsers = [];
    assert.throws(() => validate(cfg), /app\.browsers must be a non-empty array/);
  });

  it('rejects config with neither tests nor visualTests', () => {
    assert.throws(() => validate({ app: { command: 'npm start', url: 'http://localhost:3000' } }), /at least one of "tests" or "visualTests"/);
  });

  it('rejects test missing name', () => {
    const cfg = validConfig();
    cfg.tests[0].name = '';
    assert.throws(() => validate(cfg), /tests\[0\]\.name is required/);
  });

  it('rejects test missing assertions', () => {
    const cfg = validConfig();
    cfg.tests[0].assertions = [];
    assert.throws(() => validate(cfg), /tests\[0\]\.assertions must be a non-empty array/);
  });

  it('rejects invalid action type', () => {
    const cfg = validConfig();
    cfg.tests[0].actions = [{ action: 'double-click', selector: '#btn' }];
    assert.throws(() => validate(cfg), /is not valid/);
  });

  it('rejects click action missing selector', () => {
    const cfg = validConfig();
    cfg.tests[0].actions = [{ action: 'click' }];
    assert.throws(() => validate(cfg), /selector is required for "click"/);
  });

  it('rejects type action missing value', () => {
    const cfg = validConfig();
    cfg.tests[0].actions = [{ action: 'type', selector: '#x' }];
    assert.throws(() => validate(cfg), /value is required for "type"/);
  });

  it('rejects wait action missing timeout', () => {
    const cfg = validConfig();
    cfg.tests[0].actions = [{ action: 'wait' }];
    assert.throws(() => validate(cfg), /timeout is required for "wait"/);
  });

  it('rejects press action missing key', () => {
    const cfg = validConfig();
    cfg.tests[0].actions = [{ action: 'press', selector: '#s' }];
    assert.throws(() => validate(cfg), /key is required for "press"/);
  });

  it('rejects invalid assertion type', () => {
    const cfg = validConfig();
    cfg.tests[0].assertions = [{ type: 'custom-check' }];
    assert.throws(() => validate(cfg), /is not valid/);
  });

  it('rejects text-contains missing expected', () => {
    const cfg = validConfig();
    cfg.tests[0].assertions = [{ type: 'text-contains', selector: 'h1' }];
    assert.throws(() => validate(cfg), /expected is required for "text-contains"/);
  });

  it('rejects element-count with non-number expected', () => {
    const cfg = validConfig();
    cfg.tests[0].assertions = [{ type: 'element-count', selector: 'li', expected: '3' }];
    assert.throws(() => validate(cfg), /expected is required for "element-count" and must be a number/);
  });

  it('rejects attribute-equals missing attribute field', () => {
    const cfg = validConfig();
    cfg.tests[0].assertions = [{ type: 'attribute-equals', selector: 'img', expected: 'Logo' }];
    assert.throws(() => validate(cfg), /attribute is required/);
  });

  it('rejects visual test missing baseline', () => {
    const cfg = {
      app: { command: 'npm start', url: 'http://localhost:3000' },
      visualTests: [{ name: 'V', path: '/' }],
    };
    assert.throws(() => validate(cfg), /baseline is required/);
  });

  it('rejects invalid comparison mode', () => {
    const cfg = {
      app: { command: 'npm start', url: 'http://localhost:3000' },
      visualTests: [{ name: 'V', path: '/', baseline: 'x.png', comparison: { mode: 'fuzzy' } }],
    };
    assert.throws(() => validate(cfg), /comparison\.mode must be one of/);
  });

  it('rejects visualDefaults.threshold out of range', () => {
    const cfg = validConfig();
    cfg.visualDefaults = { threshold: 1.5 };
    assert.throws(() => validate(cfg), /threshold must be a number between 0 and 1/);
  });

  it('rejects negative startTimeout', () => {
    const cfg = validConfig();
    cfg.app.startTimeout = -1;
    assert.throws(() => validate(cfg), /startTimeout must be a positive number/);
  });

  // ── Multi-step (long) tests ────────────────────────────────

  it('accepts a valid multi-step test', () => {
    const cfg = validConfig({
      tests: [{
        name: 'Multi', path: '/login',
        steps: [
          { name: 'Login', actions: [{ action: 'click', selector: '#btn' }], assertions: [{ type: 'url-matches', expected: '/dashboard' }] },
          { name: 'Fill form', assertions: [{ type: 'element-exists', selector: '#form' }] },
        ],
      }],
    });
    assert.doesNotThrow(() => validate(cfg));
  });

  it('rejects multi-step test with top-level actions', () => {
    const cfg = validConfig({
      tests: [{
        name: 'Multi', path: '/login',
        actions: [{ action: 'click', selector: '#btn' }],
        steps: [
          { name: 'Step1', assertions: [{ type: 'element-exists', selector: 'h1' }] },
        ],
      }],
    });
    assert.throws(() => validate(cfg), /cannot have both "steps" and top-level "actions"/);
  });

  it('rejects multi-step test with top-level assertions', () => {
    const cfg = validConfig({
      tests: [{
        name: 'Multi', path: '/login',
        assertions: [{ type: 'element-exists', selector: 'h1' }],
        steps: [
          { name: 'Step1', assertions: [{ type: 'element-exists', selector: 'h1' }] },
        ],
      }],
    });
    assert.throws(() => validate(cfg), /cannot have both "steps" and top-level "assertions"/);
  });

  it('rejects step missing name', () => {
    const cfg = validConfig({
      tests: [{
        name: 'Multi', path: '/',
        steps: [
          { assertions: [{ type: 'element-exists', selector: 'h1' }] },
        ],
      }],
    });
    assert.throws(() => validate(cfg), /steps\[0\]\.name is required/);
  });

  it('rejects step with empty assertions', () => {
    const cfg = validConfig({
      tests: [{
        name: 'Multi', path: '/',
        steps: [
          { name: 'Step1', assertions: [] },
        ],
      }],
    });
    assert.throws(() => validate(cfg), /steps\[0\]\.assertions must be a non-empty array/);
  });

  it('rejects step with invalid action', () => {
    const cfg = validConfig({
      tests: [{
        name: 'Multi', path: '/',
        steps: [
          { name: 'Step1', actions: [{ action: 'double-click', selector: '#x' }], assertions: [{ type: 'element-exists', selector: 'h1' }] },
        ],
      }],
    });
    assert.throws(() => validate(cfg), /is not valid/);
  });

  it('rejects step with invalid assertion', () => {
    const cfg = validConfig({
      tests: [{
        name: 'Multi', path: '/',
        steps: [
          { name: 'Step1', assertions: [{ type: 'custom-check' }] },
        ],
      }],
    });
    assert.throws(() => validate(cfg), /is not valid/);
  });

  // ── goto / capture actions ─────────────────────────────

  it('accepts goto action with url', () => {
    const cfg = validConfig();
    cfg.tests[0].actions = [{ action: 'goto', url: '/items/42' }];
    assert.doesNotThrow(() => validate(cfg));
  });

  it('rejects goto action missing url', () => {
    const cfg = validConfig();
    cfg.tests[0].actions = [{ action: 'goto' }];
    assert.throws(() => validate(cfg), /url is required for "goto"/);
  });

  it('accepts capture-text action', () => {
    const cfg = validConfig();
    cfg.tests[0].actions = [{ action: 'capture-text', selector: '.id', variable: 'myId' }];
    assert.doesNotThrow(() => validate(cfg));
  });

  it('rejects capture-text missing variable', () => {
    const cfg = validConfig();
    cfg.tests[0].actions = [{ action: 'capture-text', selector: '.id' }];
    assert.throws(() => validate(cfg), /variable is required for "capture-text"/);
  });

  it('rejects capture-text missing selector', () => {
    const cfg = validConfig();
    cfg.tests[0].actions = [{ action: 'capture-text', variable: 'x' }];
    assert.throws(() => validate(cfg), /selector is required for "capture-text"/);
  });

  it('accepts capture-attribute action', () => {
    const cfg = validConfig();
    cfg.tests[0].actions = [{ action: 'capture-attribute', selector: 'a', attribute: 'href', variable: 'link' }];
    assert.doesNotThrow(() => validate(cfg));
  });

  it('rejects capture-attribute missing attribute', () => {
    const cfg = validConfig();
    cfg.tests[0].actions = [{ action: 'capture-attribute', selector: 'a', variable: 'link' }];
    assert.throws(() => validate(cfg), /attribute is required for "capture-attribute"/);
  });

  it('accepts capture-url action', () => {
    const cfg = validConfig();
    cfg.tests[0].actions = [{ action: 'capture-url', pattern: '/items/:id', variable: 'id' }];
    assert.doesNotThrow(() => validate(cfg));
  });

  it('rejects capture-url missing pattern', () => {
    const cfg = validConfig();
    cfg.tests[0].actions = [{ action: 'capture-url', variable: 'id' }];
    assert.throws(() => validate(cfg), /pattern is required for "capture-url"/);
  });

  it('rejects capture-url missing variable', () => {
    const cfg = validConfig();
    cfg.tests[0].actions = [{ action: 'capture-url', pattern: '/items/:id' }];
    assert.throws(() => validate(cfg), /variable is required for "capture-url"/);
  });
});
