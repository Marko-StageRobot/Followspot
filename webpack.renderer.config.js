const rules = require('./webpack.rules');

rules.push({
  test: /\.jsx?$/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: [
        '@babel/preset-env',
        '@babel/preset-react'
      ]
    }
  },
  exclude: /node_modules/
});

// CHANGELOG.md is built in as text for What's New (src/components/WhatsNew.jsx)
rules.push({
  test: /\.md$/,
  type: 'asset/source',
});
rules.push({
  test: /\.css$/,
  use: [
    { loader: 'style-loader' },
    { loader: 'css-loader' }
  ]
});
rules.push({
  test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
  use: {
    loader: 'file-loader',
    options: {
      name: '[name].[ext]',
    }
  }
});

module.exports = {
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  output: {
    charset: true,
  },
};