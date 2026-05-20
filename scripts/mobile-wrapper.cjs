const { existsSync, readFileSync } = require('fs');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');

const mobileDir = path.resolve(__dirname, '..');
const desktopDir = path.resolve(mobileDir, '..');
const projectRoot = path.resolve(process.env.EVIENT_ROOT || path.join(desktopDir, 'EViENT'));
const frontendDir = path.join(projectRoot, 'frontend');
const automationDir = path.join(mobileDir, 'automation');
const androidDir = path.join(mobileDir, 'android');
const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const webDistDir = path.join(projectRoot, 'frontend', 'dist');

const isWindows = process.platform === 'win32';
const npmBin = isWindows ? 'npm.cmd' : 'npm';
const npxBin = isWindows ? 'npx.cmd' : 'npx';
const gradleBin = isWindows ? 'gradlew.bat' : './gradlew';

function printHeader(title) {
  console.log(`\n== ${title} ==`);
}

function fail(message) {
  console.error(`\n[mobile-wrapper] ${message}`);
  process.exit(1);
}

function quoteForCmd(value) {
  const text = String(value);
  if (/^[\w.:/\\=-]+$/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '\\"')}"`;
}

function run(command, args, cwd) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const useCmd = isWindows && /\.(cmd|bat)$/i.test(command);
  const resolvedCommand = useCmd ? 'cmd.exe' : command;
  const resolvedArgs = useCmd
    ? ['/d', '/s', '/c', [command, ...args].map(quoteForCmd).join(' ')]
    : args;
  const result = spawnSync(resolvedCommand, resolvedArgs, {
    cwd,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      EVIENT_ROOT: projectRoot,
      EVIENT_APK_PATH: apkPath,
    },
  });

  if (result.error) {
    fail(result.error.message);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runNpmScript(cwd, script, extraArgs = []) {
  run(npmBin, ['run', script, ...extraArgs], cwd);
}

function packageHasScript(cwd, script) {
  const packagePath = path.join(cwd, 'package.json');
  if (!existsSync(packagePath)) {
    return false;
  }

  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  return Boolean(pkg.scripts?.[script]);
}

function ensureDir(dir, label) {
  if (!existsSync(dir)) {
    fail(`${label} was not found at ${dir}`);
  }
}

function ensureApk() {
  if (!existsSync(apkPath)) {
    fail(`APK was not found at ${apkPath}. Run "npm run build" first.`);
  }
}

function buildWeb() {
  ensureDir(frontendDir, 'Frontend project');
  if (packageHasScript(projectRoot, 'build:shared')) {
    runNpmScript(projectRoot, 'build:shared');
  }
  runNpmScript(frontendDir, 'build');
}

function syncAndroid() {
  if (!existsSync(webDistDir)) {
    console.log(`[mobile-wrapper] Frontend dist was not found at ${webDistDir}. Building it first.`);
    buildWeb();
  }
  run(npxBin, ['cap', 'sync', 'android'], mobileDir);
}

function buildApk() {
  ensureDir(androidDir, 'Android project');
  run(gradleBin, ['assembleDebug'], androidDir);
}

function runAutomation(script) {
  ensureDir(automationDir, 'Automation workspace');
  ensureApk();
  runNpmScript(automationDir, script);
}

function doctor() {
  printHeader('Mobile wrapper check');
  const checks = [
    ['Mobile wrapper', mobileDir],
    ['EViENT project root', projectRoot],
    ['Frontend', frontendDir],
    ['Frontend dist', webDistDir],
    ['Android project', androidDir],
    ['APK', apkPath],
    ['Automation workspace', automationDir],
    ['Automation .env fallback', path.join(projectRoot, '.env')],
  ];

  for (const [label, targetPath] of checks) {
    console.log(`${existsSync(targetPath) ? '[ok]' : '[missing]'} ${label}: ${targetPath}`);
  }
}

const actions = {
  doctor: {
    label: 'Check paths and prerequisites',
    run: doctor,
  },
  web: {
    label: 'Build frontend web',
    run: buildWeb,
  },
  sync: {
    label: 'Sync frontend into Android wrapper',
    run: syncAndroid,
  },
  apk: {
    label: 'Build Android APK',
    run: buildApk,
  },
  build: {
    label: 'Build web, sync Android, build APK',
    run: () => {
      buildWeb();
      syncAndroid();
      buildApk();
    },
  },
  open: {
    label: 'Open Android project',
    run: () => run(npxBin, ['cap', 'open', 'android'], mobileDir),
  },
  setup: {
    label: 'Install/check Appium UiAutomator2 driver',
    run: () => runNpmScript(automationDir, 'appium:setup'),
  },
  auth: {
    label: 'Run Appium auth suite',
    run: () => runAutomation('test:auth'),
  },
  admin: {
    label: 'Run Appium admin suite',
    run: () => runAutomation('test:admin'),
  },
  all: {
    label: 'Run all Appium suites',
    run: () => runAutomation('test:appium'),
  },
  login: {
    label: 'Run login success test',
    run: () => runAutomation('test:auth:login-success'),
  },
  register: {
    label: 'Run register success test',
    run: () => runAutomation('test:auth:register-success'),
  },
  otp: {
    label: 'Run wrong OTP test',
    run: () => runAutomation('test:auth:wrong-otp'),
  },
};

function printHelp() {
  printHeader('Available commands');
  for (const [name, action] of Object.entries(actions)) {
    console.log(`${name.padEnd(10)} ${action.label}`);
  }
  console.log('\nExamples:');
  console.log('  npm run menu');
  console.log('  npm run build');
  console.log('  npm run appium');
  console.log('  npm run appium:login');
}

async function menu() {
  const entries = Object.entries(actions);
  printHeader('EViENT mobile quick menu');
  entries.forEach(([name, action], index) => {
    console.log(`${index + 1}. ${name.padEnd(10)} ${action.label}`);
  });
  console.log('0. exit');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise((resolve) => {
    rl.question('\nChoose an action: ', resolve);
  });
  rl.close();

  const choice = Number(answer);
  if (!choice) {
    return;
  }

  const selected = entries[choice - 1];
  if (!selected) {
    fail(`Invalid menu choice: ${answer}`);
  }

  selected[1].run();
}

const command = process.argv[2] || 'menu';

if (command === 'help' || command === '--help' || command === '-h') {
  printHelp();
} else if (command === 'menu') {
  menu().catch((error) => fail(error.message));
} else if (actions[command]) {
  actions[command].run();
} else {
  printHelp();
  fail(`Unknown command: ${command}`);
}
