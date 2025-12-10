import path from 'path'
import {fileURLToPath} from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile next-auth to fix ESM/CJS compatibility with Next.js 15
  transpilePackages: ['next-auth'],
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
