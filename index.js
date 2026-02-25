#!/usr/bin/env node

const path = require('path');
const configLoader = require('./src/config-loader');
const serverManager = require('./src/server-manager');
const testRunner = require('./src/test-runner');
const reporter = require('./src/reporter');

async function main() {
  reporter.printBanner();
  serverManager.registerCleanup();

  // Parse CLI arguments
  const args = process.argv.slice(2);
  let configPath = 'auto-e2e.yml';
  let outputPath = 'auto-e2e-results.json';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && args[i + 1]) {
      configPath = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[++i];
    }
  }

  // Load and validate config
  let config;
  try {
    config = configLoader.load(configPath);
  } catch (err) {
    reporter.printError(err.message);
    process.exit(1);
  }

  let results;

  try {
    // Start the dev server
    reporter.printServerStart(config.app.command, config.app.url);
    const elapsedMs = await serverManager.start(config.app);
    reporter.printServerReady(elapsedMs);

    // Run tests
    results = await testRunner.run(config);
  } catch (err) {
    reporter.printError(err.message);
    serverManager.stop();
    process.exit(1);
  } finally {
    serverManager.stop();
  }

  // Write report and print summary
  const resolvedOutput = path.resolve(outputPath);
  reporter.writeJsonReport(results, resolvedOutput);
  results.reportPath = resolvedOutput;
  reporter.printSummary(results);

  process.exit(results.summary.failed > 0 ? 1 : 0);
}

main();
