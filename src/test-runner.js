const playwright = require('playwright');
const actionExecutor = require('./action-executor');
const assertionEngine = require('./assertion-engine');
const visualComparator = require('./visual-comparator');
const reporter = require('./reporter');

async function run(config) {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  const { app, tests, visualTests, visualDefaults } = config;
  const testsPerBrowser = tests.length + visualTests.length;
  const browsers = app.browsers;

  reporter.printTestPlan(tests.length, visualTests.length, browsers);

  const allResults = [];

  for (const browserName of browsers) {
    reporter.printBrowserStart(browserName);

    let browser;
    try {
      browser = await playwright[browserName].launch({ headless: app.headless });
    } catch (err) {
      throw new Error(
        `Failed to launch browser "${browserName}": ${err.message}\n` +
        `Hint: Run "npx playwright install ${browserName}" to install browser binaries.`
      );
    }

    const context = await browser.newContext({
      viewport: { width: app.viewport.width, height: app.viewport.height },
    });

    let testIndex = 0;
    const totalInBrowser = testsPerBrowser;

    // Run functional tests
    for (const test of tests) {
      const testStart = Date.now();
      reporter.printTestStart(testIndex, totalInBrowser, test.name);

      const page = await context.newPage();
      const testResult = {
        name: test.name,
        type: 'functional',
        browser: browserName,
        path: test.path,
        status: 'passed',
        durationMs: 0,
        assertions: [],
        error: null,
      };

      try {
        await page.goto(`${app.url}${test.path}`, { waitUntil: 'domcontentloaded' });

        // Execute actions
        let actionFailed = false;
        if (test.actions) {
          for (const action of test.actions) {
            try {
              await actionExecutor.execute(page, action);
            } catch (err) {
              const msg = `Action "${action.action}" failed: ${err.message}`;
              reporter.printActionError(msg);
              testResult.status = 'failed';
              testResult.error = msg;
              actionFailed = true;
              break;
            }
          }
        }

        // Evaluate assertions (only if actions succeeded)
        if (!actionFailed) {
          for (const assertion of test.assertions) {
            const result = await assertionEngine.evaluate(page, assertion);
            testResult.assertions.push(result);
            reporter.printAssertionResult(result);
            if (result.status === 'failed') {
              testResult.status = 'failed';
            }
          }
        }
      } catch (err) {
        testResult.status = 'failed';
        testResult.error = `Navigation failed: ${err.message}`;
        reporter.printActionError(testResult.error);
      }

      await page.close();
      testResult.durationMs = Date.now() - testStart;
      reporter.printTestEnd(testResult.status, testResult.durationMs);
      allResults.push(testResult);
      testIndex++;
    }

    // Run visual tests
    for (const test of visualTests) {
      const testStart = Date.now();
      reporter.printTestStart(testIndex, totalInBrowser, test.name);

      const page = await context.newPage();
      const testResult = {
        name: test.name,
        type: 'visual',
        browser: browserName,
        path: test.path,
        status: 'passed',
        durationMs: 0,
        visual: null,
        error: null,
      };

      try {
        await page.goto(`${app.url}${test.path}`, { waitUntil: 'domcontentloaded' });

        // Execute optional actions before screenshot
        if (test.actions) {
          for (const action of test.actions) {
            try {
              await actionExecutor.execute(page, action);
            } catch (err) {
              const msg = `Action "${action.action}" failed: ${err.message}`;
              reporter.printActionError(msg);
              testResult.status = 'failed';
              testResult.error = msg;
              break;
            }
          }
        }

        if (testResult.status !== 'failed') {
          // Use browser-specific subdirectories for visual comparisons
          const browserVisualDefaults = {
            ...visualDefaults,
            baselineDir: `${visualDefaults.baselineDir}/${browserName}`,
            diffDir: `${visualDefaults.diffDir}/${browserName}`,
            currentDir: `${visualDefaults.currentDir}/${browserName}`,
          };
          const visualResult = await visualComparator.captureAndCompare(page, test, browserVisualDefaults);
          testResult.visual = visualResult;
          testResult.status = visualResult.status;
          reporter.printVisualResult(visualResult);
        }
      } catch (err) {
        testResult.status = 'failed';
        testResult.error = `Visual test failed: ${err.message}`;
        reporter.printActionError(testResult.error);
      }

      await page.close();
      testResult.durationMs = Date.now() - testStart;
      reporter.printTestEnd(testResult.status, testResult.durationMs);
      allResults.push(testResult);
      testIndex++;
    }

    await browser.close();
    reporter.printBrowserEnd(browserName);
  }

  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - startTime;
  const total = allResults.length;
  const passed = allResults.filter((r) => r.status === 'passed' || r.status === 'baseline-created').length;
  const failed = allResults.filter((r) => r.status === 'failed').length;

  return {
    startedAt,
    finishedAt,
    durationMs,
    browsers,
    summary: { total, passed, failed },
    tests: allResults,
  };
}

module.exports = { run };
