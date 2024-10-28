import './worker-polyfill.js'

import { createTestWorker } from './worker.ts'
import { expect, test, describe } from 'vitest'

describe('Condition', () => {
  const workerUrl = new URL('./condition.test.worker.js', import.meta.url)

  test('safely increase counter', async () => {
    const buffer = new SharedArrayBuffer(12)
    const count = new Int32Array(buffer, 0, 1)
    const { worker: worker1, promise: worker1Promise } = createTestWorker(workerUrl, { type: 'module' })
    const { worker: worker2, promise: worker2Promise } = createTestWorker(workerUrl, { type: 'module' })
    const { worker: worker3, promise: worker3Promise } = createTestWorker(workerUrl, { type: 'module' })
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
