import webpack from 'webpack';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  entry: './src/app.js', // Adjust according to your entry file
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist/chatgpt2graph'),
    publicPath: '/chatgpt2graph/', // Important for handling the base path
    clean: true // Clean the output directory before each build
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.html$/,
        loader: 'html-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|webm)$/i,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html'

    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    })
  ],
  devServer: {
    static: path.join(__dirname, 'dist/chatgpt2graph'),
    historyApiFallback: true,
    port: 1234
  },
  mode: 'development',
  resolve: {
    fallback: {
      buffer: 'buffer/',
      crypto: 'crypto-browserify',
      child_process: false,
      fs: false,
      http: 'stream-http',
      https: 'https-browserify',
      net: false,
      tls: false,
      os: 'os-browserify/browser',
      path: 'path-browserify',
      process: 'process/browser',
      stream: 'stream-browserify',
      vm: 'vm-browserify',
      zlib: 'browserify-zlib'
    }
  }
};
