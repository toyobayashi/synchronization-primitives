import './worker-polyfill.js'

import { createTestWorker } from './worker.ts'
import { expect, test, describe } from 'vitest'
import { Mutex } from '../src/index'
import { Counter } from './counter.js'

describe('Mutex', () => {
  const workerUrl = new URL('./mutex.test.worker.js', import.meta.url)

  test('lock and unlock', () => {
    const mutex = new Mutex(new Int32Array(1))
    const lock = Mutex.lock(mutex)
    try {
      expect(lock.locked).toBe(true)
      lock.unlock()
      expect(lock.locked).toBe(false)
    } finally {
      lock[Symbol.dispose]()
    }
  })

  test('lock and unlock 64bit', () => {
    const mutex = new Mutex(new BigInt64Array(1))
    const lock = Mutex.lock(mutex)
    try {
      expect(lock.locked).toBe(true)
      lock.unlock()
      expect(lock.locked).toBe(false)
    } finally {
      lock[Symbol.dispose]()
    }
  })

  test('lockIfAvailable', () => {
    const mutex = new Mutex(new Int32Array(1))
    const lock = Mutex.lockIfAvailable(mutex, 0)!
    try {
      expect(lock).not.toBe(null)
      expect(lock.locked).toBe(true)
      lock!.unlock()
      expect(lock.locked).toBe(false)
    } finally {
      lock[Symbol.dispose]()
    }
  })

  test('unsafely increase counter', () => {
    const counter = new Counter(Mutex)
    const { worker: worker1, promise: worker1Promise } = createTestWorker(workerUrl, { type: 'module' })
    const { worker: worker2, promise: worker2Promise } = createTestWorker(workerUrl, { type: 'module' })
    const worker1Iteration = 10000
    const worker2Iteration = 10000
    worker1.postMessage({
      buffer: counter.buffer,
      iteration: worker1Iteration,
      type: 'unsafeIncrease'
    })
    worker2.postMessage({
      buffer: counter.buffer,
      iteration: worker2Iteration,
      type: 'unsafeIncrease'
    })
    return Promise.all([worker1Promise, worker2Promise]).then(() => {
      expect(counter.value).toBeLessThanOrEqual(worker1Iteration + worker2Iteration)
    })
  })

  test('safely increase counter', async () => {
    const counter = new Counter(Mutex)
    const { worker: worker1, promise: worker1Promise } = createTestWorker(workerUrl, { type: 'module' })
    const { worker: worker2, promise: worker2Promise } = createTestWorker(workerUrl, { type: 'module' })
    const worker1Iteration = 10000
    const worker2Iteration = 10000
    worker1.postMessage({
      buffer: counter.buffer,
      iteration: worker1Iteration,
      type: 'increase'
    })
    worker2.postMessage({
      buffer: counter.buffer,
      iteration: worker2Iteration,
      type: 'increase'
    })
    return Promise.all([worker1Promise, worker2Promise]).then(() => {
      expect(counter.value).toBe(worker1Iteration + worker2Iteration)
    })
  })
})
