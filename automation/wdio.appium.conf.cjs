const path = require('path');
const mobileAppDir = path.resolve(__dirname, '..');
const apkPath = process.env.EVIENT_APK_PATH
  || path.join(mobileAppDir, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

process.env.APPIUM_HOME = process.env.APPIUM_HOME || path.join(__dirname, '.appium');

exports.config = {
  runner: 'local',
  specs: [
    './appium/specs/**/*.spec.cjs',
  ],
  suites: {
    auth: [
      './appium/specs/auth.e2e.spec.cjs',
    ],
    admin: [
      './appium/specs/admin.e2e.spec.cjs',
    ],
    all: [
      './appium/specs/**/*.spec.cjs',
    ],
  },
  maxInstances: 1,
  capabilities: [{
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': process.env.EVIENT_ANDROID_DEVICE || 'Android Emulator',
    'appium:app': apkPath,
    'appium:autoWebview': true,
    'appium:autoWebviewTimeout': 20000,
    'appium:chromedriverAutodownload': true,
    'appium:newCommandTimeout': 240,
    'appium:noReset': false,
    'appium:fullReset': false,
  }],
  logLevel: 'warn',
  waitforTimeout: 20000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 2,
  services: [
    ['appium', {
      command: 'appium',
      args: {
        address: '127.0.0.1',
        port: 4723,
        relaxedSecurity: true,
      },
    }],
  ],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 180000,
  },
};
