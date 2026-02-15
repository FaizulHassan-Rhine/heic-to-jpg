module.exports = {
  reactStrictMode: true,
  // Use standalone output for better server deployment (cPanel, VPS, etc.)
  output: 'standalone',
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
