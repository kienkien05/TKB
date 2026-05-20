const { existsSync, mkdirSync } = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const automationDir = path.resolve(__dirname, '..');
const appiumHome = path.join(automationDir, '.appium');
const appiumBinary = process.platform === 'win32'
  ? path.join(automationDir, 'node_modules', '.bin', 'appium.cmd')
  : path.join(automationDir, 'node_modules', '.bin', 'appium');

function runAppiumCommand(args, captureOutput = false) {
  const result = spawnSync(appiumBinary, args, {
    cwd: automationDir,
    env: {
      ...process.env,
      APPIUM_HOME: appiumHome,
    },
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: captureOutput ? 'pipe' : 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Appium command failed: ${args.join(' ')}`);
  }

  return result;
}

if (!existsSync(appiumBinary)) {
  throw new Error(`Appium binary was not found at ${appiumBinary}. Run npm install inside automation first.`);
}

mkdirSync(appiumHome, { recursive: true });

const installedDrivers = runAppiumCommand(['driver', 'list', '--installed'], true);
const driverOutput = `${installedDrivers.stdout}\n${installedDrivers.stderr}`;

if (/uiautomator2/i.test(driverOutput)) {
  console.log('[appium-setup] UiAutomator2 driver is already installed.');
  process.exit(0);
}

console.log('[appium-setup] Installing UiAutomator2 driver...');
runAppiumCommand(['driver', 'install', 'uiautomator2']);
console.log('[appium-setup] UiAutomator2 driver installed successfully.');
