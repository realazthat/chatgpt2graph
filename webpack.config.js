import webpack from 'webpack';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  entry: './src/app.js', // Adjust according to your entry file
  output: {
    filename: '[name].[contenthash].js',
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
    new BundleAnalyzerPlugin({
      openAnalyzer: false, // Prevents the report from opening automatically
      analyzerMode: 'static', // Generates a static HTML file instead of starting a server
      defaultSizes: 'parsed' // Uses parsed sizes instead of gzip sizes for analysis
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    }),
    // new CompressionPlugin({
    //   algorithm: 'gzip',
    //   compressionOptions: { level: 9 },
    // }),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'modular.html'
    })
  ],
  devServer: {
    static: path.join(__dirname, 'dist/chatgpt2graph'),
    historyApiFallback: true,
    port: 1234
  },
  mode: 'production',
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
  },
  optimization: {
    // splitChunks: {
    //   chunks: 'all' // Splits vendor and common chunks
    // },
    minimize: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        compress: {
          // drop_console: true, // Removes console logs
          passes: 3 // Number of passes for compressing
          // pure_funcs: ['console.log'] // Removes specific functions like console.log
        },
        mangle: {
          toplevel: true // Mangle top-level variable and function names
        },
        output: {
          comments: false // Removes comments
        },
        keep_classnames: false, // Allows mangling of class names
        keep_fnames: false, // Allows mangling of function names
        toplevel: true // Enables more aggressive optimization at top-level scope
      }
    })
    ]
  }
};
