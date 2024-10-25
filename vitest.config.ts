import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    browser: {
      provider: 'playwright',
      name: 'chromium',
    },
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  }
})
