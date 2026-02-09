module.exports = {
  reactStrictMode: true,
  // Use standalone output for better server deployment (cPanel, VPS, etc.)
  output: 'standalone',
  // Required headers for FFmpeg WASM (SharedArrayBuffer)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
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