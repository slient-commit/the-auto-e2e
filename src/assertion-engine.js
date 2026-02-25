async function evaluate(page, assertion) {
  try {
    switch (assertion.type) {
      case 'element-exists':
        return await checkElementExists(page, assertion);

      case 'element-not-exists':
        return await checkElementNotExists(page, assertion);

      case 'element-visible':
        return await checkElementVisible(page, assertion);

      case 'text-contains':
        return await checkTextContains(page, assertion);

      case 'text-equals':
        return await checkTextEquals(page, assertion);

      case 'url-matches':
        return checkUrlMatches(page, assertion);

      case 'title-contains':
        return await checkTitleContains(page, assertion);

      case 'attribute-equals':
        return await checkAttributeEquals(page, assertion);

      case 'element-count':
        return await checkElementCount(page, assertion);

      default:
        return {
          status: 'failed',
          message: `Unknown assertion type: ${assertion.type}`,
        };
    }
  } catch (err) {
    return {
      status: 'failed',
      message: `${assertion.type}: ${assertion.selector || ''} - ${err.message}`,
    };
  }
}

async function checkElementExists(page, assertion) {
  const el = await page.$(assertion.selector);
  if (el) {
    return { status: 'passed', message: `element-exists: ${assertion.selector}` };
  }
  return { status: 'failed', message: `element-exists: "${assertion.selector}" not found on page` };
}

async function checkElementNotExists(page, assertion) {
  const el = await page.$(assertion.selector);
  if (!el) {
    return { status: 'passed', message: `element-not-exists: ${assertion.selector}` };
  }
  return { status: 'failed', message: `element-not-exists: "${assertion.selector}" was found on page` };
}

async function checkElementVisible(page, assertion) {
  const visible = await page.isVisible(assertion.selector);
  if (visible) {
    return { status: 'passed', message: `element-visible: ${assertion.selector}` };
  }
  return { status: 'failed', message: `element-visible: "${assertion.selector}" is not visible` };
}

async function checkTextContains(page, assertion) {
  const text = await page.textContent(assertion.selector);
  if (text && text.includes(String(assertion.expected))) {
    return { status: 'passed', message: `text-contains: ${assertion.selector} -> "${assertion.expected}"` };
  }
  return {
    status: 'failed',
    message: `text-contains: "${assertion.selector}" expected to contain "${assertion.expected}" but got "${text}"`,
  };
}

async function checkTextEquals(page, assertion) {
  const text = await page.textContent(assertion.selector);
  const trimmed = text ? text.trim() : text;
  if (trimmed === String(assertion.expected)) {
    return { status: 'passed', message: `text-equals: ${assertion.selector} -> "${assertion.expected}"` };
  }
  return {
    status: 'failed',
    message: `text-equals: "${assertion.selector}" expected "${assertion.expected}" but got "${trimmed}"`,
  };
}

function checkUrlMatches(page, assertion) {
  const url = page.url();
  if (url.includes(String(assertion.expected))) {
    return { status: 'passed', message: `url-matches: ${assertion.expected}` };
  }
  return { status: 'failed', message: `url-matches: expected URL to contain "${assertion.expected}" but got "${url}"` };
}

async function checkTitleContains(page, assertion) {
  const title = await page.title();
  if (title.includes(String(assertion.expected))) {
    return { status: 'passed', message: `title-contains: "${assertion.expected}"` };
  }
  return {
    status: 'failed',
    message: `title-contains: expected title to contain "${assertion.expected}" but got "${title}"`,
  };
}

async function checkAttributeEquals(page, assertion) {
  const value = await page.getAttribute(assertion.selector, assertion.attribute);
  if (value === String(assertion.expected)) {
    return {
      status: 'passed',
      message: `attribute-equals: ${assertion.selector}[${assertion.attribute}] = "${assertion.expected}"`,
    };
  }
  return {
    status: 'failed',
    message: `attribute-equals: ${assertion.selector}[${assertion.attribute}] expected "${assertion.expected}" but got "${value}"`,
  };
}

async function checkElementCount(page, assertion) {
  const elements = await page.$$(assertion.selector);
  const count = elements.length;
  if (count === assertion.expected) {
    return { status: 'passed', message: `element-count: ${assertion.selector} = ${assertion.expected}` };
  }
  return {
    status: 'failed',
    message: `element-count: "${assertion.selector}" expected ${assertion.expected} elements but found ${count}`,
  };
}

module.exports = { evaluate };
