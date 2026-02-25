const { spawn, execSync } = require('child_process');
const { pollUrl } = require('./utils');

let serverProcess = null;
let stderrLines = [];

async function start(appConfig) {
  const { command, url, startTimeout } = appConfig;

  stderrLines = [];

  const isWindows = process.platform === 'win32';
  const spawnOptions = {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  };

  if (!isWindows) {
    spawnOptions.detached = true;
  }

  serverProcess = spawn(command, [], spawnOptions);

  serverProcess.stdout.on('data', () => {});
  serverProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    stderrLines.push(...lines);
    if (stderrLines.length > 50) {
      stderrLines = stderrLines.slice(-50);
    }
  });

  serverProcess.on('error', (err) => {
    throw new Error(`Failed to start server with command "${command}": ${err.message}`);
  });

  try {
    const elapsedMs = await pollUrl(url, startTimeout);
    return elapsedMs;
  } catch (err) {
    const lastStderr = stderrLines.slice(-20).join('\n');
    const diagnostic = lastStderr ? `\n\nServer stderr (last 20 lines):\n${lastStderr}` : '';
    stop();
    throw new Error(`${err.message}${diagnostic}`);
  }
}

function stop() {
  if (!serverProcess) return;

  try {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-serverProcess.pid, 'SIGTERM');
    }
  } catch {
    // Process may already be dead
  }

  serverProcess = null;
}

function registerCleanup() {
  const cleanup = () => {
    stop();
    process.exit(1);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

module.exports = { start, stop, registerCleanup };
