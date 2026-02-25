const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollUrl(url, timeoutMs = 30000, intervalMs = 1000) {
  const start = Date.now();
  const client = url.startsWith('https') ? https : http;

  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = client.get(url, (res) => {
          res.resume();
          resolve();
        });
        req.on('error', reject);
        req.setTimeout(3000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
      });
      return Date.now() - start;
    } catch {
      await delay(intervalMs);
    }
  }

  throw new Error(`Server did not become ready at ${url} within ${timeoutMs}ms`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resolveFromConfig(configDir, relativePath) {
  return path.resolve(configDir, relativePath);
}

module.exports = { delay, pollUrl, ensureDir, resolveFromConfig };
