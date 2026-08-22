import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // E2E is Playwright's job; a stray import here would start a browser.
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // src/domain is pure business logic mirroring PRD §13. It is the cheapest
      // place to catch a defect, so it carries the highest bar. Raised to 100%
      // in Slice 4 once the first real domain modules land.
      include: ['src/domain/**', 'src/lib/**', 'src/offline/**'],
    },
  },
})
