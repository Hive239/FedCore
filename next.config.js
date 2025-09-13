/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  serverExternalPackages: ['@tensorflow/tfjs', '@tensorflow/tfjs-node', '@tensorflow/tfjs-layers', '@tensorflow/tfjs-converter', '@tensorflow/tfjs-backend-webgl', '@tensorflow/tfjs-core', 'sharp'],
  turbopack: {
    resolveExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  experimental: {
    optimizeCss: true,
    scrollRestoration: true, // Better scroll behavior
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-select',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-accordion',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-separator',
      'date-fns',
      '@tanstack/react-query',
      'recharts'
    ]
  },
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false
  },
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp']
  },
  // Performance optimizations
  webpack: (config, { dev, isServer }) => {
    // Disable webpack cache completely
    config.cache = false;
    
    // Optimize bundle size for Vercel deployment
    if (isServer) {
      // Externalize ALL TensorFlow packages on server
      config.externals = [
        ...(config.externals || []), 
        '@tensorflow/tfjs',
        '@tensorflow/tfjs-node',
        '@tensorflow/tfjs-core',
        '@tensorflow/tfjs-layers',
        '@tensorflow/tfjs-converter',
        '@tensorflow/tfjs-backend-webgl',
        /@tensorflow\/tfjs.*/
      ];
    }
    
    // Reduce bundle size
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        stream: false,
        util: false
      }
      
      // Replace TensorFlow.js with a lighter version in production
      if (process.env.NODE_ENV === 'production') {
        config.resolve.alias = {
          ...config.resolve.alias,
          '@tensorflow/tfjs$': '@tensorflow/tfjs-core',
          '@tensorflow/tfjs-layers$': false,
          '@tensorflow/tfjs-converter$': false,
          '@tensorflow/tfjs-backend-webgl$': false
        }
      }
    }

    // Optimize for production
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            default: false,
            vendors: false,
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true
            },
            lib: {
              test(module) {
                return module.size() > 160000 &&
                  /node_modules[\\/]/.test(module.identifier())
              },
              name(module) {
                const hash = require('crypto').createHash('sha1')
                hash.update(module.identifier())
                return hash.digest('hex').substring(0, 8)
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true
            },
            mapbox: {
              name: 'mapbox',
              test: /[\\/]node_modules[\\/](mapbox-gl|@mapbox)[\\/]/,
              chunks: 'async',
              priority: 20,
              enforce: true
            },
            commons: {
              name: 'commons',
              chunks: 'initial',
              minChunks: 2,
              priority: 10
            },
            shared: {
              name(module, chunks) {
                return `shared-${require('crypto')
                  .createHash('sha1')
                  .update(chunks.reduce((acc, chunk) => acc + chunk.name, ''))
                  .digest('hex')
                  .substring(0, 8)}`
              },
              priority: 10,
              minChunks: 2,
              reuseExistingChunk: true
            }
          }
        },
        runtimeChunk: {
          name: 'runtime'
        }
      }
    }

    return config
  },
  // Headers for caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate'
          }
        ]
      }
    ]
  }
}

// Export configuration
module.exports = nextConfig