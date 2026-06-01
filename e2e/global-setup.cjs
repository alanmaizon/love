const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

const root = path.join(__dirname, '..');

module.exports = async function globalSetup() {
  dotenv.config({ path: path.join(root, 'love_backend', '.env') });

  const sk = process.env.STRIPE_SECRET_KEY || '';
  if (!sk || sk.includes('...')) {
    throw new Error(
      'E2E requires STRIPE_SECRET_KEY in love_backend/.env (Stripe test mode).'
    );
  }
  execSync('python manage.py e2e_prepare', {
    cwd: path.join(root, 'love_backend'),
    env: {
      ...process.env,
      DJANGO_SETTINGS_MODULE: 'config.settings.dev',
      PATH: `${path.join(root, 'love_backend', '.venv', 'bin')}:${process.env.PATH}`,
    },
    stdio: 'inherit',
  });
};
