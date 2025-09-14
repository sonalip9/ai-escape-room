import type { GlobalConfig } from 'semantic-release';

const config: GlobalConfig = {
  branches: ['main'],
  plugins: [
    // Determine the type of release by analyzing commits with conventional-changelog
    '@semantic-release/commit-analyzer',

    // Generate release notes for the commits added since the last release with conventional-changelog
    '@semantic-release/release-notes-generator',

    // Create or update the changelog file in the local project repository
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'pnpm-lock.yaml'],
        message: 'ci(release): ${nextRelease.version}\n\n${nextRelease.notes}',
      },
    ],
    [
      '@semantic-release/github',
      {
        releasedLabels: ['released'],
        successComment: '✅ Release `${nextRelease.version}` is now available!',
        failComment: '❌ Release failed. Check the logs.',
      },
    ],
  ],
};

export default config;
