# EViENT Mobile Automation

Thu muc nay chua automation test cho mobile cua EViENT bang Appium va WebdriverIO.
No dang nam ben trong `mobile_app/automation` de mobile wrapper va test nam cung mot cho.

## Thu muc

- `appium/specs/`: Appium auth/admin suites cho Android
- `appium/helpers/`: helper Appium + Mongo test data
- `scripts/ensure-appium-driver.cjs`: cai UiAutomator2 driver vao `automation/.appium`
- `automation-agent.mjs`: runner nho de map target sang npm script

## Chay truc tiep

```bash
cd automation
npm install
npm run test:mobile
npm run test:auth
npm run test:admin
npm run test:appium
```

Appium yeu cau emulator Android dang chay va APK da duoc cai.

## Chay tu mobile wrapper

```bash
cd ..
npm run menu
npm run appium
npm run appium:admin
```
