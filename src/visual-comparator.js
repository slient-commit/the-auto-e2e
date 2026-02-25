const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const { ensureDir } = require('./utils');

async function captureAndCompare(page, visualTest, visualDefaults) {
  const { baselineDir, diffDir, currentDir, failOnMissingBaseline } = visualDefaults;
  const baselineFile = visualTest.baseline;

  const baselinePath = path.join(baselineDir, baselineFile);
  const currentPath = path.join(currentDir, baselineFile);
  const diffPath = path.join(diffDir, baselineFile);

  const comparison = visualTest.comparison || {};
  const mode = comparison.mode || 'threshold';
  const maxDiffPercent = comparison.maxDiffPercent ?? 1.0;
  const threshold = comparison.threshold ?? visualDefaults.threshold;

  // Ensure output directories exist
  ensureDir(currentDir);
  ensureDir(diffDir);
  ensureDir(baselineDir);

  // Take the screenshot
  const screenshotOptions = visualTest.screenshotOptions || {};
  let screenshotBuffer;

  if (screenshotOptions.selector) {
    const locator = page.locator(screenshotOptions.selector);
    screenshotBuffer = await locator.screenshot({ type: 'png' });
  } else {
    screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: screenshotOptions.fullPage || false,
    });
  }

  // Save current screenshot
  fs.writeFileSync(currentPath, screenshotBuffer);

  // Check if baseline exists
  if (!fs.existsSync(baselinePath)) {
    if (failOnMissingBaseline) {
      return {
        status: 'failed',
        diffPixels: 0,
        diffPercent: 0,
        baselinePath,
        currentPath,
        diffPath: null,
        message: `Baseline not found: ${baselinePath}`,
      };
    }

    // Auto-create baseline
    fs.copyFileSync(currentPath, baselinePath);
    return {
      status: 'baseline-created',
      diffPixels: 0,
      diffPercent: 0,
      baselinePath,
      currentPath,
      diffPath: null,
      message: `Baseline created at ${baselinePath}`,
    };
  }

  // Load both images
  const baselineImg = PNG.sync.read(fs.readFileSync(baselinePath));
  const currentImg = PNG.sync.read(screenshotBuffer);

  // Check dimension match
  if (baselineImg.width !== currentImg.width || baselineImg.height !== currentImg.height) {
    return {
      status: 'failed',
      diffPixels: 0,
      diffPercent: 100,
      baselinePath,
      currentPath,
      diffPath: null,
      message: `Dimension mismatch: baseline ${baselineImg.width}x${baselineImg.height} vs current ${currentImg.width}x${currentImg.height}`,
    };
  }

  const { width, height } = baselineImg;
  const diffImg = new PNG({ width, height });

  const diffPixels = pixelmatch(
    baselineImg.data,
    currentImg.data,
    diffImg.data,
    width,
    height,
    { threshold }
  );

  const totalPixels = width * height;
  const diffPercent = (diffPixels / totalPixels) * 100;

  let passed;
  let message;

  if (mode === 'pixel-perfect') {
    passed = diffPixels === 0;
    message = passed
      ? `0 different pixels (pixel-perfect)`
      : `${diffPixels} different pixels (${diffPercent.toFixed(2)}%) - pixel-perfect mode requires 0`;
  } else {
    // threshold mode
    passed = diffPercent <= maxDiffPercent;
    message = passed
      ? `${diffPercent.toFixed(2)}% pixels differ (threshold: ${maxDiffPercent}%)`
      : `${diffPercent.toFixed(2)}% pixels differ (threshold: ${maxDiffPercent}%)`;
  }

  let savedDiffPath = null;
  if (!passed) {
    // Save diff image on failure
    fs.writeFileSync(diffPath, PNG.sync.write(diffImg));
    savedDiffPath = diffPath;
  }

  return {
    status: passed ? 'passed' : 'failed',
    diffPixels,
    diffPercent: parseFloat(diffPercent.toFixed(2)),
    baselinePath,
    currentPath,
    diffPath: savedDiffPath,
    message,
  };
}

module.exports = { captureAndCompare };
