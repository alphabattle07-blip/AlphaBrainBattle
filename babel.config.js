module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ... other plugins you might have
      'react-native-reanimated/plugin', // This must be the last plugin
    ],
  };
};