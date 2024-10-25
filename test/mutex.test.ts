// import { type WorkerOptions } from 'worker_threads'
import { expect, test, describe } from 'vitest'
import { Mutex } from '../src/index'
import { Counter } from './counter'

import { Worker } from './worker.cjs'

describe('Mutex', () => {
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
    const counter = new Counter()
    const worker1 = new Worker(new URL('./mutex.test.worker.cjs', import.meta.url))
    const worker2 = new Worker(new URL('./mutex.test.worker.cjs', import.meta.url))
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
    const worker1Promise = new Promise<void>((resolve, reject) => {
      worker1.onerror = (e) => {
        reject(e)
      }
      worker1.onmessage = (e) => {
        if (e.data === 'done') {
          resolve()
        }
      }
    })
    const worker2Promise = new Promise<void>((resolve, reject) => {
      worker2.onerror = (e) => {
        reject(e)
      }
      worker2.onmessage = (e) => {
        if (e.data === 'done') {
          resolve()
        }
      }
    })
    return Promise.all([worker1Promise, worker2Promise]).then(() => {
      expect(counter.value).toBeLessThanOrEqual(worker1Iteration + worker2Iteration)
    })
  })

  test('safely increase counter', async () => {
    const counter = new Counter()
    const worker1 = new Worker(new URL('./mutex.test.worker.cjs', import.meta.url))
    const worker2 = new Worker(new URL('./mutex.test.worker.cjs', import.meta.url))
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
    const worker1Promise = new Promise<void>((resolve, reject) => {
      worker1.onerror = (e) => {
        reject(e)
      }
      worker1.onmessage = (e) => {
        if (e.data === 'done') {
          resolve()
        }
      }
    })
    const worker2Promise = new Promise<void>((resolve, reject) => {
      worker2.onerror = (e) => {
        reject(e)
      }
      worker2.onmessage = (e) => {
        if (e.data === 'done') {
          resolve()
        }
      }
    })
    return Promise.all([worker1Promise, worker2Promise]).then(() => {
      expect(counter.value).toBe(worker1Iteration + worker2Iteration)
    })
  })
})
