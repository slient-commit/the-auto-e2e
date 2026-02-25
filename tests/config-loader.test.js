const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { load } = require('../src/config-loader');

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-e2e-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeYaml(filename, content) {
  const filePath = path.join(tmpDir, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

describe('config-loader.load', () => {
  // ── File handling ─────────────────────────────────────

  it('throws when config file does not exist', () => {
    assert.throws(() => load('/nonexistent/auto-e2e.yml'), /Config file not found/);
  });

  it('throws on invalid YAML syntax', () => {
    const filePath = writeYaml('bad.yml', ':\n  - :\n  }: invalid');
    assert.throws(() => load(filePath), /Invalid YAML/);
  });

  // ── Defaults ──────────────────────────────────────────

  it('applies all default values', () => {
    const yml = `
app:
  command: "npm run dev"
  url: "http://localhost:4200"
tests:
  - name: "T1"
    path: "/"
    assertions:
      - type: element-exists
        selector: "h1"
`;
    const cfg = load(writeYaml('defaults.yml', yml));

    assert.equal(cfg.app.startTimeout, 30000);
    assert.deepEqual(cfg.app.browsers, ['chromium']);
    assert.equal(cfg.app.headless, true);
    assert.equal(cfg.app.viewport.width, 1280);
    assert.equal(cfg.app.viewport.height, 720);

    assert.equal(cfg.visualDefaults.threshold, 0.1);
    assert.equal(cfg.visualDefaults.failOnMissingBaseline, false);
  });

  it('preserves user-specified values over defaults', () => {
    const yml = `
app:
  command: "ng serve"
  url: "https://localhost:4200"
  startTimeout: 60000
  headless: false
  viewport:
    width: 1920
    height: 1080
  browsers:
    - firefox
    - webkit
visualDefaults:
  threshold: 0.5
  failOnMissingBaseline: true
tests:
  - name: "T"
    path: "/"
    assertions:
      - type: element-exists
        selector: "body"
`;
    const cfg = load(writeYaml('custom.yml', yml));

    assert.equal(cfg.app.startTimeout, 60000);
    assert.deepEqual(cfg.app.browsers, ['firefox', 'webkit']);
    assert.equal(cfg.app.headless, false);
    assert.equal(cfg.app.viewport.width, 1920);
    assert.equal(cfg.app.viewport.height, 1080);
    assert.equal(cfg.visualDefaults.threshold, 0.5);
    assert.equal(cfg.visualDefaults.failOnMissingBaseline, true);
  });

  // ── Browser normalization ─────────────────────────────

  it('normalizes single browser string to browsers array', () => {
    const yml = `
app:
  command: "npm start"
  url: "http://localhost:3000"
  browser: "firefox"
tests:
  - name: "T"
    path: "/"
    assertions:
      - type: element-exists
        selector: "h1"
`;
    const cfg = load(writeYaml('single-browser.yml', yml));

    assert.deepEqual(cfg.app.browsers, ['firefox']);
    assert.equal(cfg.app.browser, undefined);
  });

  it('prefers browsers array over browser string', () => {
    const yml = `
app:
  command: "npm start"
  url: "http://localhost:3000"
  browser: "firefox"
  browsers:
    - webkit
tests:
  - name: "T"
    path: "/"
    assertions:
      - type: element-exists
        selector: "h1"
`;
    const cfg = load(writeYaml('both-browser.yml', yml));

    assert.deepEqual(cfg.app.browsers, ['webkit']);
  });

  // ── Path resolution ───────────────────────────────────

  it('resolves visual paths relative to config file directory', () => {
    const yml = `
app:
  command: "npm start"
  url: "http://localhost:3000"
visualDefaults:
  baselineDir: "./my-baselines"
  diffDir: "./my-diffs"
  currentDir: "./my-current"
tests:
  - name: "T"
    path: "/"
    assertions:
      - type: element-exists
        selector: "body"
`;
    const cfg = load(writeYaml('paths.yml', yml));

    assert.equal(cfg.visualDefaults.baselineDir, path.resolve(tmpDir, './my-baselines'));
    assert.equal(cfg.visualDefaults.diffDir, path.resolve(tmpDir, './my-diffs'));
    assert.equal(cfg.visualDefaults.currentDir, path.resolve(tmpDir, './my-current'));
  });

  // ── Validation pass-through ───────────────────────────

  it('rejects config that fails schema validation', () => {
    const yml = `
app:
  command: "npm start"
`;
    assert.throws(() => load(writeYaml('invalid-schema.yml', yml)), /app\.url is required/);
  });
});
