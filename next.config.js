/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client',
      'prisma',
      '@whiskeysockets/baileys',
      'ws',
      'bufferutil',
      'utf-8-validate',
      'pino',
      'qrcode',
      '@hapi/boom',
    ],
    // Enable instrumentation hook for server startup initialization
    instrumentationHook: true,
  },
  webpack: (config, { isServer }) => {
    // Mark these packages as externals to prevent bundling
    if (isServer) {
      config.externals = config.externals || []
      // Handle array externals
      if (Array.isArray(config.externals)) {
        config.externals.push({
          '@whiskeysockets/baileys': 'commonjs @whiskeysockets/baileys',
          'ws': 'commonjs ws',
          'bufferutil': 'commonjs bufferutil',
          'utf-8-validate': 'commonjs utf-8-validate',
          'pino': 'commonjs pino',
          'qrcode': 'commonjs qrcode',
          '@hapi/boom': 'commonjs @hapi/boom',
        })
      } else {
        // If externals is a function or object, wrap it
        const originalExternals = config.externals
        config.externals = [
          originalExternals,
          {
            '@whiskeysockets/baileys': 'commonjs @whiskeysockets/baileys',
            'ws': 'commonjs ws',
            'bufferutil': 'commonjs bufferutil',
            'utf-8-validate': 'commonjs utf-8-validate',
            'pino': 'commonjs pino',
            'qrcode': 'commonjs qrcode',
            '@hapi/boom': 'commonjs @hapi/boom',
          },
        ]
      }
    } else {
      // For client-side, completely ignore these packages
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@whiskeysockets/baileys': false,
        'ws': false,
        'bufferutil': false,
        'utf-8-validate': false,
        'pino': false,
        'qrcode': false,
        '@hapi/boom': false,
      }
    }
    return config
  },
}

module.exports = nextConfig
