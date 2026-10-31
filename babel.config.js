module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        root: ['./'],
        alias: {
          '@': './src',
          '@/components': './src/components',
          '@/features': './src/features',
          '@/sources': './src/sources',
          '@/locales': './src/locales',
          '@/hooks': './src/hooks',
        }
      }]
    ]
  };
};