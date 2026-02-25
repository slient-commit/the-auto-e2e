const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { delay, ensureDir, resolveFromConfig } = require('../src/utils');

describe('utils.delay', () => {
  it('resolves after approximately the given ms', async () => {
    const start = Date.now();
    await delay(50);
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 40, `Expected >= 40ms, got ${elapsed}ms`);
  });
});

describe('utils.ensureDir', () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('creates a nested directory that does not exist', () => {
    tmpDir = path.join(os.tmpdir(), `auto-e2e-ensure-${Date.now()}`, 'a', 'b', 'c');
    ensureDir(tmpDir);
    assert.ok(fs.existsSync(tmpDir));
  });

  it('does not throw when directory already exists', () => {
    tmpDir = path.join(os.tmpdir(), `auto-e2e-ensure-exist-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    assert.doesNotThrow(() => ensureDir(tmpDir));
  });
});

describe('utils.resolveFromConfig', () => {
  it('resolves a relative path from config directory', () => {
    const configDir = '/home/user/project';
    const result = resolveFromConfig(configDir, './screenshots/baseline');
    assert.equal(result, path.resolve('/home/user/project', './screenshots/baseline'));
  });

  it('returns absolute path unchanged', () => {
    const abs = path.resolve('/tmp/baselines');
    const result = resolveFromConfig('/some/dir', abs);
    assert.equal(result, abs);
  });
});
