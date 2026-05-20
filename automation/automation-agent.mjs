import process from 'process'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const automationDir = path.dirname(fileURLToPath(import.meta.url))
const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const targetScripts = {
  mobile: 'test:auth',
  auth: 'test:auth',
  'auth-empty-email': 'test:auth:empty-email',
  'auth-empty-password': 'test:auth:empty-password',
  'auth-wrong-password': 'test:auth:wrong-password',
  'auth-empty-full-name': 'test:auth:empty-full-name',
  'auth-duplicate-email': 'test:auth:duplicate-email',
  'auth-wrong-otp': 'test:auth:wrong-otp',
  'auth-register-success': 'test:auth:register-success',
  'auth-login-success': 'test:auth:login-success',
  admin: 'test:admin',
  full: 'test:appium',
}

const target = process.argv[2] || 'auth'
const script = targetScripts[target] || targetScripts.auth

console.log(`[automation-agent] Running ${script} for target "${target}"`)

const result = spawnSync(
  process.platform === 'win32' ? 'cmd.exe' : npmExecutable,
  process.platform === 'win32' ? ['/d', '/s', '/c', `npm run ${script}`] : ['run', script],
  {
  cwd: automationDir,
  stdio: 'inherit',
  shell: false,
  env: process.env,
  }
)

if (result.error) {
  console.error(result.error)
  process.exitCode = 1
} else {
  process.exitCode = result.status ?? 1
}
