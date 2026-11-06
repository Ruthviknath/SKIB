import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: './tests/global-setup.ts',
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      SMS_PROVIDER: 'mock',
      UPLOAD_DIR: 'uploads-test',
    },
  },
});
