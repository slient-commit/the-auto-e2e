const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { validate } = require('./schema');
const { resolveFromConfig } = require('./utils');

const DEFAULTS = {
  app: {
    startTimeout: 30000,
    browsers: ['chromium'],
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  visualDefaults: {
    baselineDir: './screenshots/baseline',
    diffDir: './screenshots/diff',
    currentDir: './screenshots/current',
    threshold: 0.1,
    failOnMissingBaseline: false,
  },
};

function load(filePath) {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  let config;

  try {
    config = yaml.load(content);
  } catch (err) {
    throw new Error(`Invalid YAML: ${err.message}`);
  }

  applyDefaults(config);

  validate(config);

  const configDir = path.dirname(absolutePath);
  resolvePaths(config, configDir);

  return config;
}

function applyDefaults(config) {
  if (!config.app) config.app = {};
  config.app.startTimeout = config.app.startTimeout ?? DEFAULTS.app.startTimeout;

  // Normalize browser/browsers: accept either a single string or an array
  if (config.app.browser && !config.app.browsers) {
    config.app.browsers = [config.app.browser];
  }
  config.app.browsers = config.app.browsers ?? DEFAULTS.app.browsers;
  delete config.app.browser;

  config.app.headless = config.app.headless ?? DEFAULTS.app.headless;
  config.app.viewport = config.app.viewport ?? {};
  config.app.viewport.width = config.app.viewport.width ?? DEFAULTS.app.viewport.width;
  config.app.viewport.height = config.app.viewport.height ?? DEFAULTS.app.viewport.height;

  if (!config.visualDefaults) config.visualDefaults = {};
  config.visualDefaults.baselineDir = config.visualDefaults.baselineDir ?? DEFAULTS.visualDefaults.baselineDir;
  config.visualDefaults.diffDir = config.visualDefaults.diffDir ?? DEFAULTS.visualDefaults.diffDir;
  config.visualDefaults.currentDir = config.visualDefaults.currentDir ?? DEFAULTS.visualDefaults.currentDir;
  config.visualDefaults.threshold = config.visualDefaults.threshold ?? DEFAULTS.visualDefaults.threshold;
  config.visualDefaults.failOnMissingBaseline = config.visualDefaults.failOnMissingBaseline ?? DEFAULTS.visualDefaults.failOnMissingBaseline;

  if (!config.tests) config.tests = [];
  if (!config.visualTests) config.visualTests = [];
}

function resolvePaths(config, configDir) {
  config.visualDefaults.baselineDir = resolveFromConfig(configDir, config.visualDefaults.baselineDir);
  config.visualDefaults.diffDir = resolveFromConfig(configDir, config.visualDefaults.diffDir);
  config.visualDefaults.currentDir = resolveFromConfig(configDir, config.visualDefaults.currentDir);
}

module.exports = { load };
