// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Your custom configs here
  {
    rules: {
      // Single-word UI primitives (Button, Card, Input, …) are idiomatic in the
      // shadcn-vue / Nuxt auto-imported `components/ui` layer. Mirrors the same
      // opt-out the root flat config applies repo-wide.
      'vue/multi-word-component-names': 'off',
      // The codebase uses self-closing void elements (`<input />`, `<img />`)
      // consistently (shadcn-vue convention). @nuxt/eslint 1.x flips this to
      // non-self-closing; keep the existing style to avoid a churn-only diff.
      'vue/html-self-closing': 'off',
    },
  },
)
