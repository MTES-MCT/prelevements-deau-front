import path from 'path'
import {fileURLToPath} from 'url'

import {LEGACY_STATS_PATH, STATS_PATH} from './src/lib/public-routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Transpile next-auth to fix ESM/CJS compatibility with Next.js 15
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    },
    authInterrupts: true,
    middlewareClientMaxBodySize: '50mb'
  },
  transpilePackages: ['next-auth'],
  async redirects() {
    return [
      {
        source: LEGACY_STATS_PATH,
        destination: STATS_PATH,
        permanent: true
      }
    ]
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.woff2$/,
      type: 'asset/resource'
    })
    config.resolve.alias['@'] = path.resolve(__dirname, 'src')
    return config
  }
}

export default nextConfig
