const path = require('path');

module.exports = {
  reactStrictMode: true,
  // Use standalone output for better server deployment (cPanel, VPS, etc.)
  output: 'standalone',
  transpilePackages: ['upscaler', '@upscalerjs/esrgan-slim'],
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.convertmastery.com' }],
        destination: 'https://convertmastery.com/:path*',
        permanent: true,
      },
    ];
  },
  // Required headers for FFmpeg WASM (SharedArrayBuffer) - only on video pages
  async headers() {
    return [
      // Video pages need COOP/COEP for SharedArrayBuffer
      {
        source: '/video-convert',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        source: '/video-compress',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        source: '/video-trim',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      // API routes - add caching headers
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // onnxruntime-web / @huggingface/transformers ship .mjs bundles; webpack must treat them as ESM
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });

    // Client: use ort.min.mjs (non-bundled) instead of ort.bundle.min.mjs. The bundle relies on
    // import.meta.url + Webpack's RelativeURL and throws: url.replace is not a function (#22113).
    // Server: stub — this page only loads ORT in the browser (dynamic import in event handlers).
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'onnxruntime-web': path.resolve(
          __dirname,
          'node_modules/onnxruntime-web/dist/ort.min.mjs'
        ),
      };
    } else {
      config.resolve.alias = {
        ...config.resolve.alias,
        'onnxruntime-web': false,
      };
    }

    // UpscalerJS / TFJS are browser-only
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        upscaler: false,
        '@upscalerjs/esrgan-slim': false,
        '@tensorflow/tfjs': false,
      };
    }

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    // Prevent webpack from bundling pdfjs-dist on the server (use native require)
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('pdfjs-dist', 'pdfjs-dist/legacy/build/pdf.js');
    }
    return config;
  },
};
