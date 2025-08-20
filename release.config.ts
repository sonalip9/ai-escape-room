import { GlobalConfig } from 'semantic-release';

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

    // Creates a pull request containing changes for any files you want to publish in your repository
    [
      'semantic-release-github-pullrequest',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        baseRef: 'main',
        branch: 'release/${nextRelease.version}',
        pullrequestTitle: 'ci(release): ${nextRelease.version}',
      },
    ],

    [
      '@semantic-release/github',
      {
        releasedLabels: ['released'],
        successComment: '✅ This release is now available!',
        failComment: '❌ Release failed, please check the logs.',
      },
    ],
  ],
};

export default config;
