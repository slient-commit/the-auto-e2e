#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BLUE = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const autoE2eDir = __dirname;
const projectDir = path.dirname(autoE2eDir);
const configDest = path.join(projectDir, 'auto-e2e.yml');

console.log(`\n${BLUE}${BOLD}auto-e2e setup${RESET}\n`);

// Step 1: npm install
console.log(`${BOLD}[1/3]${RESET} Installing dependencies...`);
try {
  execSync('npm install', { cwd: autoE2eDir, stdio: 'pipe' });
  console.log(`${GREEN}  Done${RESET}\n`);
} catch (err) {
  console.error(`  Failed: ${err.message}`);
  process.exit(1);
}

// Step 2: Install Playwright browsers
const browsers = process.argv.slice(2);
const browserList = browsers.length > 0 ? browsers : ['chromium'];

console.log(`${BOLD}[2/3]${RESET} Installing Playwright browsers: ${browserList.join(', ')}...`);
try {
  execSync(`npx playwright install ${browserList.join(' ')}`, { cwd: autoE2eDir, stdio: 'pipe' });
  console.log(`${GREEN}  Done${RESET}\n`);
} catch (err) {
  console.error(`  Failed: ${err.message}`);
  process.exit(1);
}

// Step 3: Generate starter config
console.log(`${BOLD}[3/3]${RESET} Generating config...`);
if (fs.existsSync(configDest)) {
  console.log(`${YELLOW}  auto-e2e.yml already exists, skipping${RESET}\n`);
} else {
  const sample = fs.readFileSync(path.join(autoE2eDir, 'auto-e2e.sample.yml'), 'utf8');
  fs.writeFileSync(configDest, sample, 'utf8');
  console.log(`${GREEN}  Created auto-e2e.yml${RESET}\n`);
}

// Done
const folderName = path.basename(autoE2eDir);
console.log(`${GREEN}${BOLD}Setup complete!${RESET}\n`);
console.log(`${BOLD}Next steps:${RESET}`);
console.log(`  1. Edit ${BLUE}auto-e2e.yml${RESET} to match your app`);
console.log(`  2. Run  ${BLUE}node ${folderName}/index.js${RESET}\n`);
