module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/test/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/test/jest-setup.js'],
  clearMocks: true,
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@expo/.*|expo(?:-[^/]+)?(?:/.*)?|@gluestack-ui/.*|@testing-library/react-native|react-native-svg|uniwind|test-renderer)/)',
  ],
};
