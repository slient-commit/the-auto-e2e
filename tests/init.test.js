const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

// We test the init logic by requiring the module and calling it
// with a mocked process.cwd and stubbed execSync
const initPath = path.join(__dirname, '..', 'commands', 'init.js');

describe('commands/init', () => {
  let tmpDir;
  let originalCwd;
  let originalExit;
  let exitCode;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-e2e-init-'));
    originalCwd = process.cwd;
    process.cwd = () => tmpDir;
    originalExit = process.exit;
    exitCode = null;
    process.exit = (code) => { exitCode = code; };
  });

  afterEach(() => {
    process.cwd = originalCwd;
    process.exit = originalExit;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    // Clear require cache so each test gets a fresh module
    delete require.cache[require.resolve(initPath)];
  });

  it('copies sample yml to CWD when file does not exist', () => {
    // We need to mock execSync to avoid actually installing browsers
    const childProcess = require('child_process');
    const originalExecSync = childProcess.execSync;
    let execCalls = [];
    childProcess.execSync = (cmd, opts) => { execCalls.push({ cmd, opts }); };

    try {
      const init = require(initPath);
      init([]);

      const configPath = path.join(tmpDir, 'auto-e2e.yml');
      assert.ok(fs.existsSync(configPath), 'auto-e2e.yml should be created');

      const samplePath = path.join(__dirname, '..', 'auto-e2e.sample.yml');
      const expected = fs.readFileSync(samplePath, 'utf8');
      const actual = fs.readFileSync(configPath, 'utf8');
      assert.equal(actual, expected, 'Content should match sample yml');
    } finally {
      childProcess.execSync = originalExecSync;
    }
  });

  it('skips copy when auto-e2e.yml already exists', () => {
    const configPath = path.join(tmpDir, 'auto-e2e.yml');
    fs.writeFileSync(configPath, 'existing content', 'utf8');

    const childProcess = require('child_process');
    const originalExecSync = childProcess.execSync;
    childProcess.execSync = () => {};

    try {
      const init = require(initPath);
      init([]);

      const content = fs.readFileSync(configPath, 'utf8');
      assert.equal(content, 'existing content', 'Existing file should not be overwritten');
    } finally {
      childProcess.execSync = originalExecSync;
    }
  });

  it('passes browser arguments to playwright install', () => {
    const childProcess = require('child_process');
    const originalExecSync = childProcess.execSync;
    let execCalls = [];
    childProcess.execSync = (cmd, opts) => { execCalls.push({ cmd, opts }); };

    try {
      const init = require(initPath);
      init(['firefox', 'webkit']);

      assert.equal(execCalls.length, 1);
      assert.ok(execCalls[0].cmd.includes('firefox webkit'), 'Should pass browser args');
    } finally {
      childProcess.execSync = originalExecSync;
    }
  });

  it('defaults to chromium when no browsers specified', () => {
    const childProcess = require('child_process');
    const originalExecSync = childProcess.execSync;
    let execCalls = [];
    childProcess.execSync = (cmd, opts) => { execCalls.push({ cmd, opts }); };

    try {
      const init = require(initPath);
      init([]);

      assert.equal(execCalls.length, 1);
      assert.ok(execCalls[0].cmd.includes('chromium'), 'Should default to chromium');
    } finally {
      childProcess.execSync = originalExecSync;
    }
  });
});
