import './worker-polyfill.js'

import { promisifyTestWorker } from './worker.ts'
import { expect, test, describe } from 'vitest'
import { Semaphore } from '../lib/index.js'

import SemaphoreWorker from './semaphore.test.worker.js?worker'

describe('Semaphore', () => {

  test('Order', async () => {
    const threadCount = 3
    const semaphoreSize = 4
    const bufferLengthSize = 4
    const bufferSize = 128
    const emitCount = 5
    const memory = new SharedArrayBuffer(threadCount * semaphoreSize + bufferLengthSize + bufferSize)
    const workers = Array(threadCount).fill(null).map(() => SemaphoreWorker())
    const workerPromises = workers.map(worker => promisifyTestWorker(worker))
    const sems = workers.map((_, index) => new Semaphore(new Int32Array(memory, index * semaphoreSize, 1)))
    const length = new Uint32Array(memory, threadCount * semaphoreSize, 1)
    workers.forEach((worker, index) => {
      worker.postMessage({
        type: 'worker',
        buffer: memory,
        length,
        sem: index,
        emitCount,
        bufferStart: threadCount * semaphoreSize + bufferLengthSize,
        threadCount
      })
    })

    const main = SemaphoreWorker()
    main.postMessage({
      type: 'main',
      buffer: memory,
      length,
      emitCount,
      bufferStart: threadCount * semaphoreSize + bufferLengthSize,
      threadCount
    })
    return Promise.all([promisifyTestWorker(main), ...workerPromises]).then(([str, ..._]) => {
      expect(length[0]).toBe(threadCount * emitCount)
      expect(str).toBe('ABC'.repeat(emitCount))
    })
  })
})
