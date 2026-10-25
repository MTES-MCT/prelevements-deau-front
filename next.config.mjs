import path from 'path'
import {fileURLToPath} from 'url'

import {LEGACY_STATS_PATH, STATS_PATH} from './src/lib/public-routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Keep the Node-only workbook generator out of client bundles.
  serverExternalPackages: ['xlsx-populate'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    },
    authInterrupts: true,
    proxyClientMaxBodySize: '50mb'
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
  webpack(config, {webpack}) {
    config.module.rules.push({
      test: /\.woff2$/,
      type: 'asset/resource'
    })
    config.resolve.alias['@'] = path.resolve(__dirname, 'src')
    // react-dsfr 1.35 resets window.dsfr when its starter is re-evaluated in
    // development, even though the runtime import can remain cached.
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^\.{1,2}\/start(?:\.js)?$/, resource => {
      if (/[\\/]@codegouvfr[\\/]react-dsfr(?:[\\/]|$)/.test(resource.context)) {
        resource.request = path.resolve(__dirname, 'src/dsfr-bootstrap/start.js')
      }
    }))
    return config
  }
}

export default nextConfig
