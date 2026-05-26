module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@tobeatraveller/shared': '../shared/src/index.js',
          },
        },
      ],
    ],
  };
};
