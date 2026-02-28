const VALID_BROWSERS = ['chromium', 'firefox', 'webkit'];
const VALID_ACTIONS = [
  'click', 'type', 'hover', 'select', 'scroll',
  'wait', 'wait-for-selector', 'wait-for-navigation',
  'press', 'clear', 'goto',
  'capture-text', 'capture-attribute', 'capture-url'
];
const VALID_ASSERTION_TYPES = [
  'element-exists', 'element-not-exists', 'element-visible',
  'text-contains', 'text-equals', 'url-matches',
  'title-contains', 'attribute-equals', 'element-count'
];
const VALID_COMPARISON_MODES = ['pixel-perfect', 'threshold'];

function validate(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Config error: configuration must be an object');
  }

  validateApp(config.app);
  if (config.visualDefaults) {
    validateVisualDefaults(config.visualDefaults);
  }

  const hasTests = Array.isArray(config.tests) && config.tests.length > 0;
  const hasVisualTests = Array.isArray(config.visualTests) && config.visualTests.length > 0;

  if (!hasTests && !hasVisualTests) {
    throw new Error('Config error: at least one of "tests" or "visualTests" must be defined');
  }

  if (hasTests) {
    config.tests.forEach((test, i) => validateTest(test, i));
  }

  if (hasVisualTests) {
    config.visualTests.forEach((test, i) => validateVisualTest(test, i));
  }
}

function validateApp(app) {
  if (!app || typeof app !== 'object') {
    throw new Error('Config error: "app" section is required');
  }
  if (!app.command || typeof app.command !== 'string') {
    throw new Error('Config error: app.command is required and must be a string');
  }
  if (!app.url || typeof app.url !== 'string') {
    throw new Error('Config error: app.url is required and must be a string');
  }
  if (!app.url.startsWith('http://') && !app.url.startsWith('https://')) {
    throw new Error('Config error: app.url must start with http:// or https://');
  }
  if (app.startTimeout !== undefined && (typeof app.startTimeout !== 'number' || app.startTimeout <= 0)) {
    throw new Error('Config error: app.startTimeout must be a positive number');
  }
  if (app.browsers !== undefined) {
    if (!Array.isArray(app.browsers) || app.browsers.length === 0) {
      throw new Error('Config error: app.browsers must be a non-empty array');
    }
    for (const b of app.browsers) {
      if (!VALID_BROWSERS.includes(b)) {
        throw new Error(`Config error: app.browsers contains invalid browser "${b}". Must be one of: ${VALID_BROWSERS.join(', ')}`);
      }
    }
  }
  if (app.viewport) {
    if (typeof app.viewport !== 'object') {
      throw new Error('Config error: app.viewport must be an object with width and height');
    }
    if (app.viewport.width !== undefined && (typeof app.viewport.width !== 'number' || app.viewport.width <= 0)) {
      throw new Error('Config error: app.viewport.width must be a positive number');
    }
    if (app.viewport.height !== undefined && (typeof app.viewport.height !== 'number' || app.viewport.height <= 0)) {
      throw new Error('Config error: app.viewport.height must be a positive number');
    }
  }
}

function validateVisualDefaults(defaults) {
  if (typeof defaults !== 'object') {
    throw new Error('Config error: visualDefaults must be an object');
  }
  if (defaults.threshold !== undefined) {
    if (typeof defaults.threshold !== 'number' || defaults.threshold < 0 || defaults.threshold > 1) {
      throw new Error('Config error: visualDefaults.threshold must be a number between 0 and 1');
    }
  }
}

function validateTest(test, index) {
  const prefix = `tests[${index}]`;

  if (!test.name || typeof test.name !== 'string') {
    throw new Error(`Config error: ${prefix}.name is required and must be a string`);
  }
  if (!test.path || typeof test.path !== 'string') {
    throw new Error(`Config error: ${prefix}.path is required and must be a string`);
  }

  const hasSteps = Array.isArray(test.steps) && test.steps.length > 0;
  const hasAssertions = Array.isArray(test.assertions) && test.assertions.length > 0;

  // Multi-step test: must not have top-level actions or assertions
  if (hasSteps) {
    if (test.actions) {
      throw new Error(`Config error: ${prefix} cannot have both "steps" and top-level "actions"`);
    }
    if (test.assertions) {
      throw new Error(`Config error: ${prefix} cannot have both "steps" and top-level "assertions"`);
    }
    test.steps.forEach((step, j) => validateStep(step, `${prefix}.steps[${j}]`));
    return;
  }

  // Standard test: must have assertions
  if (test.actions) {
    if (!Array.isArray(test.actions)) {
      throw new Error(`Config error: ${prefix}.actions must be an array`);
    }
    test.actions.forEach((action, j) => validateAction(action, `${prefix}.actions[${j}]`));
  }

  if (!hasAssertions) {
    throw new Error(`Config error: ${prefix}.assertions must be a non-empty array`);
  }
  test.assertions.forEach((assertion, j) => validateAssertion(assertion, `${prefix}.assertions[${j}]`));
}

function validateStep(step, prefix) {
  if (!step.name || typeof step.name !== 'string') {
    throw new Error(`Config error: ${prefix}.name is required and must be a string`);
  }

  if (step.actions) {
    if (!Array.isArray(step.actions)) {
      throw new Error(`Config error: ${prefix}.actions must be an array`);
    }
    step.actions.forEach((action, j) => validateAction(action, `${prefix}.actions[${j}]`));
  }

  if (!step.assertions || !Array.isArray(step.assertions) || step.assertions.length === 0) {
    throw new Error(`Config error: ${prefix}.assertions must be a non-empty array`);
  }
  step.assertions.forEach((assertion, j) => validateAssertion(assertion, `${prefix}.assertions[${j}]`));
}

function validateAction(action, prefix) {
  if (!action.action || typeof action.action !== 'string') {
    throw new Error(`Config error: ${prefix}.action is required`);
  }
  if (!VALID_ACTIONS.includes(action.action)) {
    throw new Error(`Config error: ${prefix}.action "${action.action}" is not valid. Must be one of: ${VALID_ACTIONS.join(', ')}`);
  }

  switch (action.action) {
    case 'click':
    case 'hover':
    case 'scroll':
    case 'clear':
      if (!action.selector) throw new Error(`Config error: ${prefix}.selector is required for "${action.action}"`);
      break;
    case 'type':
      if (!action.selector) throw new Error(`Config error: ${prefix}.selector is required for "type"`);
      if (action.value === undefined) throw new Error(`Config error: ${prefix}.value is required for "type"`);
      break;
    case 'select':
      if (!action.selector) throw new Error(`Config error: ${prefix}.selector is required for "select"`);
      if (action.value === undefined) throw new Error(`Config error: ${prefix}.value is required for "select"`);
      break;
    case 'wait':
      if (action.timeout === undefined || typeof action.timeout !== 'number') {
        throw new Error(`Config error: ${prefix}.timeout is required for "wait" and must be a number`);
      }
      break;
    case 'wait-for-selector':
      if (!action.selector) throw new Error(`Config error: ${prefix}.selector is required for "wait-for-selector"`);
      break;
    case 'press':
      if (!action.selector) throw new Error(`Config error: ${prefix}.selector is required for "press"`);
      if (!action.key) throw new Error(`Config error: ${prefix}.key is required for "press"`);
      break;
    case 'goto':
      if (!action.url || typeof action.url !== 'string') throw new Error(`Config error: ${prefix}.url is required for "goto" and must be a string`);
      break;
    case 'capture-text':
      if (!action.selector) throw new Error(`Config error: ${prefix}.selector is required for "capture-text"`);
      if (!action.variable || typeof action.variable !== 'string') throw new Error(`Config error: ${prefix}.variable is required for "capture-text" and must be a string`);
      break;
    case 'capture-attribute':
      if (!action.selector) throw new Error(`Config error: ${prefix}.selector is required for "capture-attribute"`);
      if (!action.attribute) throw new Error(`Config error: ${prefix}.attribute is required for "capture-attribute"`);
      if (!action.variable || typeof action.variable !== 'string') throw new Error(`Config error: ${prefix}.variable is required for "capture-attribute" and must be a string`);
      break;
    case 'capture-url':
      if (!action.pattern || typeof action.pattern !== 'string') throw new Error(`Config error: ${prefix}.pattern is required for "capture-url" and must be a string`);
      if (!action.variable || typeof action.variable !== 'string') throw new Error(`Config error: ${prefix}.variable is required for "capture-url" and must be a string`);
      break;
  }
}

function validateAssertion(assertion, prefix) {
  if (!assertion.type || typeof assertion.type !== 'string') {
    throw new Error(`Config error: ${prefix}.type is required`);
  }
  if (!VALID_ASSERTION_TYPES.includes(assertion.type)) {
    throw new Error(`Config error: ${prefix}.type "${assertion.type}" is not valid. Must be one of: ${VALID_ASSERTION_TYPES.join(', ')}`);
  }

  switch (assertion.type) {
    case 'element-exists':
    case 'element-not-exists':
    case 'element-visible':
      if (!assertion.selector) throw new Error(`Config error: ${prefix}.selector is required for "${assertion.type}"`);
      break;
    case 'text-contains':
    case 'text-equals':
      if (!assertion.selector) throw new Error(`Config error: ${prefix}.selector is required for "${assertion.type}"`);
      if (assertion.expected === undefined) throw new Error(`Config error: ${prefix}.expected is required for "${assertion.type}"`);
      break;
    case 'url-matches':
    case 'title-contains':
      if (assertion.expected === undefined) throw new Error(`Config error: ${prefix}.expected is required for "${assertion.type}"`);
      break;
    case 'attribute-equals':
      if (!assertion.selector) throw new Error(`Config error: ${prefix}.selector is required for "attribute-equals"`);
      if (!assertion.attribute) throw new Error(`Config error: ${prefix}.attribute is required for "attribute-equals"`);
      if (assertion.expected === undefined) throw new Error(`Config error: ${prefix}.expected is required for "attribute-equals"`);
      break;
    case 'element-count':
      if (!assertion.selector) throw new Error(`Config error: ${prefix}.selector is required for "element-count"`);
      if (assertion.expected === undefined || typeof assertion.expected !== 'number') {
        throw new Error(`Config error: ${prefix}.expected is required for "element-count" and must be a number`);
      }
      break;
  }
}

function validateVisualTest(test, index) {
  const prefix = `visualTests[${index}]`;

  if (!test.name || typeof test.name !== 'string') {
    throw new Error(`Config error: ${prefix}.name is required and must be a string`);
  }
  if (!test.path || typeof test.path !== 'string') {
    throw new Error(`Config error: ${prefix}.path is required and must be a string`);
  }
  if (!test.baseline || typeof test.baseline !== 'string') {
    throw new Error(`Config error: ${prefix}.baseline is required and must be a string`);
  }

  if (test.actions) {
    if (!Array.isArray(test.actions)) {
      throw new Error(`Config error: ${prefix}.actions must be an array`);
    }
    test.actions.forEach((action, j) => validateAction(action, `${prefix}.actions[${j}]`));
  }

  if (test.comparison) {
    if (test.comparison.mode && !VALID_COMPARISON_MODES.includes(test.comparison.mode)) {
      throw new Error(`Config error: ${prefix}.comparison.mode must be one of: ${VALID_COMPARISON_MODES.join(', ')}`);
    }
    if (test.comparison.maxDiffPercent !== undefined) {
      if (typeof test.comparison.maxDiffPercent !== 'number' || test.comparison.maxDiffPercent < 0 || test.comparison.maxDiffPercent > 100) {
        throw new Error(`Config error: ${prefix}.comparison.maxDiffPercent must be a number between 0 and 100`);
      }
    }
    if (test.comparison.threshold !== undefined) {
      if (typeof test.comparison.threshold !== 'number' || test.comparison.threshold < 0 || test.comparison.threshold > 1) {
        throw new Error(`Config error: ${prefix}.comparison.threshold must be a number between 0 and 1`);
      }
    }
  }
}

module.exports = { validate };
