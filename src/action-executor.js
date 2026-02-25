async function execute(page, action) {
  switch (action.action) {
    case 'click':
      await page.click(action.selector);
      break;

    case 'type':
      await page.fill(action.selector, String(action.value));
      break;

    case 'hover':
      await page.hover(action.selector);
      break;

    case 'select':
      await page.selectOption(action.selector, String(action.value));
      break;

    case 'scroll':
      await page.locator(action.selector).scrollIntoViewIfNeeded();
      break;

    case 'wait':
      await page.waitForTimeout(action.timeout);
      break;

    case 'wait-for-selector':
      await page.waitForSelector(action.selector, {
        timeout: action.timeout || 5000,
      });
      break;

    case 'wait-for-navigation':
      await page.waitForLoadState('networkidle');
      break;

    case 'press':
      await page.press(action.selector, action.key);
      break;

    case 'clear':
      await page.fill(action.selector, '');
      break;

    default:
      throw new Error(`Unknown action: ${action.action}`);
  }
}

module.exports = { execute };
