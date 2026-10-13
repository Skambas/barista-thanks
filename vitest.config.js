import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
    environment: 'node',
    testTimeout: 15000, // перший запуск Fastify на холодному кеші буває повільним
  },
});
