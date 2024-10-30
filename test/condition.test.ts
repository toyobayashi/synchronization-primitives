import './worker-polyfill.js'

import { promisifyTestWorker } from './worker.ts'
import { expect, test, describe } from 'vitest'

import ConditionWorker from './condition.test.worker.js?worker'

describe('Condition', () => {

  test('safely increase counter', async () => {
    const buffer = new SharedArrayBuffer(12)
    const count = new Int32Array(buffer, 0, 1)
    const worker1 = ConditionWorker()
    const worker1Promise = promisifyTestWorker(worker1)
    const worker2 = ConditionWorker()
    const worker2Promise = promisifyTestWorker(worker2)
    const worker3 = ConditionWorker()
    const worker3Promise = promisifyTestWorker(worker3)
    const worker1Iteration = 10000
    const worker2Iteration = 10000
    const payload = 2233
    worker1.postMessage({
      buffer,
      iteration: worker1Iteration,
      payload,
      type: 'init-counter'
    })
    worker2.postMessage({
      buffer,
      iteration: worker2Iteration,
      payload,
      type: 'init-counter'
    })
    worker3.postMessage({
      buffer,
      type: 'init-watcher',
      payload
    })
    return Promise.all([worker1Promise, worker2Promise, worker3Promise]).then(() => {
      expect(count[0]).toBe(worker1Iteration + worker2Iteration - payload)
    })
  })
})
