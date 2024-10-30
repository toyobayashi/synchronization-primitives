import './worker-polyfill.js'

import { createTestWorker } from './worker.ts'
import { expect, test, describe, beforeAll, vi, afterAll } from 'vitest'
import { Counter } from './counter.js'

describe('Mutex', () => {
  const workerUrl = new URL('./mutex.test.worker.js', import.meta.url)

  let Mutex: typeof import('..').Mutex

  beforeAll(async () => {
    // vi.spyOn(Atomics, 'wait').mockImplementation(() => {
    //   throw new TypeError('Atomics.wait cannot be called in this context')
    // })

    Mutex = (await import('../lib/index.js')).Mutex
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

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

  test('bad type', () => {
    expect(() => new Mutex(new Uint32Array([1]) as any)).toThrow(TypeError)
    expect(() => Mutex.lock(null as any)).toThrow(TypeError)
    expect(() => Mutex.lockIfAvailable(null as any, 0)).toThrow(TypeError)
    expect(() => Mutex.lockIfAvailable(new Mutex(new Int32Array(1)), 0, 0 as any)).toThrow(TypeError)
    expect(() => {
      const mutex = new Mutex(new Int32Array(1))
      const lock = Mutex.lock(mutex)
      Mutex.lockIfAvailable(new Mutex(new Int32Array(1)), 0, lock)
    }).toThrow(Error)
  })

  test('lock timeout', () => {
    const mutex = new Mutex(new Int32Array(new SharedArrayBuffer(4)))
    const lock = Mutex.lock(mutex)
    try {
      expect(lock.locked).toBe(true)
      expect(Mutex.lockIfAvailable(mutex, 100)).toBe(null)
    } finally {
      lock[Symbol.dispose]()
    }
  })

  const unsafeIncrease = (useBigInt) => {
    const counter = new Counter(useBigInt, Mutex)
    const { worker: worker1, promise: worker1Promise } = createTestWorker(workerUrl, { type: 'module' })
    const { worker: worker2, promise: worker2Promise } = createTestWorker(workerUrl, { type: 'module' })
    const worker1Iteration = 10000
    const worker2Iteration = 10000
    worker1.postMessage({
      buffer: counter.buffer,
      iteration: worker1Iteration,
      useBigInt,
      type: 'unsafeIncrease'
    })
    worker2.postMessage({
      buffer: counter.buffer,
      iteration: worker2Iteration,
      useBigInt,
      type: 'unsafeIncrease'
    })
    return Promise.all([worker1Promise, worker2Promise]).then(() => {
      expect(counter.value).toBeLessThanOrEqual(worker1Iteration + worker2Iteration)
    })
  }

  test('unsafely increase counter', () => {
    return unsafeIncrease(false)
  })

  test('unsafely increase counter 64bit', () => {
    return unsafeIncrease(true)
  })

  const safeIncrease = (useBigInt) => {
    const counter = new Counter(useBigInt, Mutex)
    const { worker: worker1, promise: worker1Promise } = createTestWorker(workerUrl, { type: 'module' })
    const { worker: worker2, promise: worker2Promise } = createTestWorker(workerUrl, { type: 'module' })
    const worker1Iteration = 10000
    const worker2Iteration = 10000
    worker1.postMessage({
      buffer: counter.buffer,
      iteration: worker1Iteration,
      useBigInt,
      type: 'increase'
    })
    worker2.postMessage({
      buffer: counter.buffer,
      iteration: worker2Iteration,
      useBigInt,
      type: 'increase'
    })
    return Promise.all([worker1Promise, worker2Promise]).then(() => {
      expect(counter.value).toBe(worker1Iteration + worker2Iteration)
    })
  }

  test('safely increase counter', () => {
    return safeIncrease(false)
  })

  test('safely increase counter 64bit', () => {
    return safeIncrease(true)
  })
})
