import shared from '../../eslint.config.shared.mjs'

export default [
  ...shared,
  {
    ignores: ['dist/**', 'android/**']
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // The shell talks to the Capacitor bridge, which is absent in a plain
      // browser (vite dev); those call sites are guarded by isNativePlatform().
      'no-undef': 'off'
    }
  }
]
