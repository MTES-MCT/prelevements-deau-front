import {mkdirSync, writeFileSync} from 'node:fs'
import {dirname} from 'node:path'

// IDs are provided by Playwright, including the project and repeat index.
// This reporter runs for --list too, without starting the synthetic servers.
export default class BrowserCiReporter {
  results = []
  errors = 0

  onBegin(config, suite) {
    this.tests = suite.allTests().map(test => ({
      id: test.id, project: test.parent.project().name, expectedStatus: test.expectedStatus
    }))
  }

  onTestEnd(test, result) {
    // Runtime annotations (including beforeEach) may mark a listed test skipped or failing.
    this.results.push({id: test.id, status: result.status, expectedStatus: test.expectedStatus})
  }

  onError() {
    this.errors++
  }

  onEnd(result) {
    const filename = process.env.BROWSER_CI_REPORT
    if (!filename) throw new Error('BROWSER_CI_REPORT is required')
    mkdirSync(dirname(filename), {recursive: true})
    writeFileSync(filename, JSON.stringify({
      version: 1, sha: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID,
      attempt: process.env.GITHUB_RUN_ATTEMPT, part: process.env.BROWSER_CI_PART,
      status: result.status, errors: this.errors, tests: this.tests, results: this.results
    }) + '\n')
  }
}
