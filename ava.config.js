/**
 * AVA configuration
 * https://github.com/avajs/ava/blob/main/docs/06-configuration.md
 */

const config = {
  files: [
    'src/**/*.test.js'
  ],
  nodeArguments: [
    '--loader=./ava-loader.js'
  ],
  environmentVariables: {
    NODE_ENV: 'test'
  },
  timeout: '2m',
  concurrency: 5,
  failFast: false,
  verbose: true
}

export default config
