import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      ADMIN_KEY: 'test-admin-key',
    },
  },
});
