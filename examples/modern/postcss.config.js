const config = {
    default: {
      color: 'white'
    },
    other: {
      color: 'black'
    }
  };

module.exports = {
    plugins: [
        require('postcss-nested'),
        require('autoprefixer'),
        require('postcss-themed')({ config }),
    ],
};