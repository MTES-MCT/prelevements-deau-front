import path from 'path'
import {fileURLToPath} from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
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
