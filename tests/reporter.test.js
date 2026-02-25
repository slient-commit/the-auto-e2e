const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { writeJsonReport } = require('../src/reporter');

describe('reporter.writeJsonReport', () => {
  let tmpFile;

  afterEach(() => {
    if (tmpFile && fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  });

  it('writes a valid JSON file with all expected fields', () => {
    tmpFile = path.join(os.tmpdir(), `auto-e2e-report-${Date.now()}.json`);

    const results = {
      startedAt: '2026-01-01T00:00:00.000Z',
      finishedAt: '2026-01-01T00:00:10.000Z',
      durationMs: 10000,
      browsers: ['chromium', 'firefox'],
      summary: { total: 4, passed: 3, failed: 1 },
      tests: [
        {
          name: 'Homepage', type: 'functional', browser: 'chromium',
          path: '/', status: 'passed', durationMs: 1200,
          assertions: [{ status: 'passed', message: 'element-exists: h1' }],
          error: null,
        },
        {
          name: 'Visual', type: 'visual', browser: 'chromium',
          path: '/', status: 'passed', durationMs: 800,
          visual: { status: 'passed', diffPixels: 0, diffPercent: 0 },
          error: null,
        },
        {
          name: 'Homepage', type: 'functional', browser: 'firefox',
          path: '/', status: 'passed', durationMs: 1400,
          assertions: [{ status: 'passed', message: 'element-exists: h1' }],
          error: null,
        },
        {
          name: 'Login', type: 'functional', browser: 'firefox',
          path: '/login', status: 'failed', durationMs: 2000,
          assertions: [{ status: 'failed', message: 'url-matches: expected /dash got /login' }],
          error: null,
        },
      ],
    };

    writeJsonReport(results, tmpFile);

    assert.ok(fs.existsSync(tmpFile), 'Report file should exist');

    const report = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));

    assert.equal(report.startedAt, '2026-01-01T00:00:00.000Z');
    assert.equal(report.finishedAt, '2026-01-01T00:00:10.000Z');
    assert.equal(report.durationMs, 10000);
    assert.deepEqual(report.browsers, ['chromium', 'firefox']);
    assert.deepEqual(report.summary, { total: 4, passed: 3, failed: 1 });
    assert.equal(report.tests.length, 4);
    assert.equal(report.tests[0].browser, 'chromium');
    assert.equal(report.tests[3].status, 'failed');
  });

  it('writes pretty-printed JSON (indented with 2 spaces)', () => {
    tmpFile = path.join(os.tmpdir(), `auto-e2e-report-fmt-${Date.now()}.json`);

    writeJsonReport({
      startedAt: 'x', finishedAt: 'y', durationMs: 0,
      browsers: ['chromium'], summary: { total: 0, passed: 0, failed: 0 }, tests: [],
    }, tmpFile);

    const raw = fs.readFileSync(tmpFile, 'utf8');
    assert.ok(raw.includes('\n  "startedAt"'), 'JSON should be indented with 2 spaces');
  });
});
