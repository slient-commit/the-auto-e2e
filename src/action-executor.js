const { resolveVariables } = require('./utils');

function resolveAction(action, variables) {
  if (!variables || Object.keys(variables).length === 0) return action;
  const resolved = { ...action };
  if (resolved.selector) resolved.selector = resolveVariables(resolved.selector, variables);
  if (resolved.value !== undefined && typeof resolved.value === 'string') resolved.value = resolveVariables(resolved.value, variables);
  if (resolved.url) resolved.url = resolveVariables(resolved.url, variables);
  if (resolved.key) resolved.key = resolveVariables(resolved.key, variables);
  if (resolved.pattern) resolved.pattern = resolveVariables(resolved.pattern, variables);
  if (resolved.attribute) resolved.attribute = resolveVariables(resolved.attribute, variables);
  return resolved;
}

function extractFromUrl(url, pattern) {
  // If pattern contains parentheses → regex mode
  if (pattern.includes('(')) {
    const regex = new RegExp(pattern);
    const match = url.match(regex);
    if (match && match[1] !== undefined) return match[1];
    throw new Error(`Pattern "${pattern}" did not match URL "${url}"`);
  }

  // Named segment mode: /items/:itemId → /items/([^/]+)
  const segmentRegex = pattern.replace(/:(\w+)/g, '([^/]+)');
  const regex = new RegExp(segmentRegex);
  const match = url.match(regex);
  if (match && match[1] !== undefined) return match[1];
  throw new Error(`Pattern "${pattern}" did not match URL "${url}"`);
}

async function execute(page, action, variables = {}, baseUrl = '') {
  const resolved = resolveAction(action, variables);

  switch (resolved.action) {
    case 'click':
      await page.click(resolved.selector);
      break;

    case 'type':
      await page.fill(resolved.selector, String(resolved.value));
      break;

    case 'hover':
      await page.hover(resolved.selector);
      break;

    case 'select':
      await page.selectOption(resolved.selector, String(resolved.value));
      break;

    case 'scroll':
      await page.locator(resolved.selector).scrollIntoViewIfNeeded();
      break;

    case 'wait':
      await page.waitForTimeout(resolved.timeout);
      break;

    case 'wait-for-selector':
      await page.waitForSelector(resolved.selector, {
        timeout: resolved.timeout || 5000,
      });
      break;

    case 'wait-for-navigation':
      await page.waitForLoadState('networkidle');
      break;

    case 'press':
      await page.press(resolved.selector, resolved.key);
      break;

    case 'clear':
      await page.fill(resolved.selector, '');
      break;

    case 'goto': {
      const url = resolved.url.startsWith('http') ? resolved.url : baseUrl + resolved.url;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      break;
    }

    case 'capture-text': {
      const text = await page.textContent(resolved.selector);
      variables[action.variable] = text ? text.trim() : '';
      break;
    }

    case 'capture-attribute': {
      const val = await page.getAttribute(resolved.selector, resolved.attribute);
      variables[action.variable] = val ?? '';
      break;
    }

    case 'capture-url': {
      const currentUrl = page.url();
      variables[action.variable] = extractFromUrl(currentUrl, resolved.pattern);
      break;
    }

    default:
      throw new Error(`Unknown action: ${resolved.action}`);
  }
}

module.exports = { execute };
