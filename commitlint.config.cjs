/** Conventional Commits — enforced via Husky commit-msg hook. */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'refactor', 'docs', 'test', 'build', 'ci', 'perf', 'style', 'revert'],
    ],
  },
};
