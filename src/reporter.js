const fs = require('fs');
const chalk = require('chalk');

function printBanner() {
  console.log(chalk.bold.cyan('\nauto-e2e v1.0.0\n'));
}

function printServerStart(command, url) {
  console.log(chalk.dim(`Starting server: ${command}`));
  console.log(chalk.dim(`Waiting for ${url} ...`));
}

function printServerReady(elapsedMs) {
  console.log(chalk.green(`Server ready (${(elapsedMs / 1000).toFixed(1)}s)\n`));
}

function printTestPlan(functionalCount, visualCount, browsers) {
  const parts = [];
  if (functionalCount > 0) parts.push(`${functionalCount} functional test${functionalCount !== 1 ? 's' : ''}`);
  if (visualCount > 0) parts.push(`${visualCount} visual test${visualCount !== 1 ? 's' : ''}`);
  const browserList = browsers.map((b) => chalk.cyan(b)).join(', ');
  const suffix = browsers.length > 1 ? ` across ${browsers.length} browsers` : '';
  console.log(chalk.bold(`Running ${parts.join(', ')}${suffix}`));
  console.log(chalk.dim(`Browsers: ${browserList}\n`));
}

function printBrowserStart(browserName) {
  console.log(chalk.bold.cyan(`\n--- ${browserName} ---\n`));
}

function printBrowserEnd(browserName) {
  console.log(chalk.dim(`--- ${browserName} done ---\n`));
}

function printTestStart(index, total, testName) {
  console.log(chalk.bold(`  [${index + 1}/${total}] ${testName}`));
}

function printStepStart(stepIndex, totalSteps, stepName) {
  console.log(chalk.bold(`    Step [${stepIndex + 1}/${totalSteps}] ${stepName}`));
}

function printStepEnd(status) {
  if (status === 'passed') {
    console.log(`      ${chalk.green.bold('STEP PASSED')}`);
  } else {
    console.log(`      ${chalk.red.bold('STEP FAILED')}`);
  }
}

function printAssertionResult(result) {
  const icon = result.status === 'passed' ? chalk.green('PASS') : chalk.red('FAIL');
  console.log(`    ${icon}  ${result.message}`);
}

function printVisualResult(result) {
  if (result.status === 'baseline-created') {
    console.log(`    ${chalk.yellow('BASELINE CREATED')}  ${result.message}`);
  } else if (result.status === 'passed') {
    console.log(`    ${chalk.green('PASS')}  ${result.message}`);
  } else {
    console.log(`    ${chalk.red('FAIL')}  ${result.message}`);
    if (result.diffPath) {
      console.log(chalk.dim(`    Diff saved to ${result.diffPath}`));
    }
  }
}

function printTestEnd(status, durationMs) {
  const duration = chalk.dim(`(${(durationMs / 1000).toFixed(1)}s)`);
  if (status === 'passed') {
    console.log(`    ${chalk.green.bold('PASSED')} ${duration}\n`);
  } else if (status === 'baseline-created') {
    console.log(`    ${chalk.yellow.bold('BASELINE CREATED')} ${duration}\n`);
  } else {
    console.log(`    ${chalk.red.bold('FAILED')} ${duration}\n`);
  }
}

function printActionError(message) {
  console.log(`    ${chalk.red('ERROR')}  ${message}`);
}

function printSummary(results) {
  const line = chalk.dim('─'.repeat(40));
  console.log(line);

  const { passed, failed, total } = results.summary;
  const baselineCreated = results.tests.filter((t) => t.status === 'baseline-created').length;

  const parts = [];
  parts.push(chalk.green(`${passed} passed`));
  if (baselineCreated > 0) parts.push(chalk.yellow(`${baselineCreated} baseline created`));
  if (failed > 0) parts.push(chalk.red(`${failed} failed`));
  parts.push(`${total} total`);

  console.log(`Results: ${parts.join(', ')}`);
  console.log(`Duration: ${(results.durationMs / 1000).toFixed(1)}s`);

  if (results.reportPath) {
    console.log(`Report saved to ${chalk.bold(results.reportPath)}`);
  }

  console.log(line);
}

function printError(message) {
  console.error(chalk.red.bold(`\nError: ${message}\n`));
}

function writeJsonReport(results, outputPath) {
  const report = {
    startedAt: results.startedAt,
    finishedAt: results.finishedAt,
    durationMs: results.durationMs,
    browsers: results.browsers,
    summary: results.summary,
    tests: results.tests,
  };
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
}

module.exports = {
  printBanner,
  printServerStart,
  printServerReady,
  printTestPlan,
  printBrowserStart,
  printBrowserEnd,
  printTestStart,
  printStepStart,
  printStepEnd,
  printAssertionResult,
  printVisualResult,
  printTestEnd,
  printActionError,
  printSummary,
  printError,
  writeJsonReport,
};
