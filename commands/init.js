const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BLUE = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function init(args) {
  const cwd = process.cwd();
  const configDest = path.join(cwd, 'auto-e2e.yml');

  console.log(`\n${BLUE}${BOLD}the-auto-e2e init${RESET}\n`);

  // Step 1: Install Playwright browsers
  const browsers = args.filter(a => !a.startsWith('--'));
  const browserList = browsers.length > 0 ? browsers : ['chromium'];

  console.log(`${BOLD}[1/2]${RESET} Installing Playwright browsers: ${browserList.join(', ')}...`);
  try {
    execSync(`npx playwright install ${browserList.join(' ')}`, { cwd, stdio: 'inherit' });
    console.log(`${GREEN}  Done${RESET}\n`);
  } catch (err) {
    console.error(`  Failed: ${err.message}`);
    process.exit(1);
  }

  // Step 2: Generate starter config
  console.log(`${BOLD}[2/2]${RESET} Generating config...`);
  if (fs.existsSync(configDest)) {
    console.log(`${YELLOW}  auto-e2e.yml already exists, skipping${RESET}\n`);
  } else {
    const samplePath = path.join(__dirname, '..', 'auto-e2e.sample.yml');
    const sample = fs.readFileSync(samplePath, 'utf8');
    fs.writeFileSync(configDest, sample, 'utf8');
    console.log(`${GREEN}  Created auto-e2e.yml${RESET}\n`);
  }

  // Done
  console.log(`${GREEN}${BOLD}Setup complete!${RESET}\n`);
  console.log(`${BOLD}Next steps:${RESET}`);
  console.log(`  1. Edit ${BLUE}auto-e2e.yml${RESET} to match your app`);
  console.log(`  2. Run  ${BLUE}npx the-auto-e2e${RESET}\n`);
}

module.exports = init;
