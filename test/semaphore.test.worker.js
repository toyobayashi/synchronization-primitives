import './worker-polyfill.js'
import { Semaphore } from '../lib/index.js'

self.onmessage = function (e) {
  const { type, buffer, sem, emitCount, length, bufferStart, threadCount } = e.data

  if (type === 'worker') {
    const semaphore = new Semaphore(new Int32Array(buffer, sem * 4, 1))
    for (let i = 0; i < emitCount; ++i) {
      Semaphore.release(semaphore)
      console.log('worker release')
    }
    postMessage('exit')
  } else if (type === 'main') {
    const sems = Array(threadCount).fill(null).map((_, index) => new Semaphore(new Int32Array(buffer, index * 4, 1)))
    const strBuffer = new Uint8Array(buffer, bufferStart)

    for (let i = 0; i < emitCount; ++i) {
      sems.forEach((sem, index) => {
        console.log(111)
        Semaphore.acquire(sem)
        console.log(222)
        const idx = Atomics.load(length, 0)
        Atomics.store(strBuffer, idx, index + 65)
        Atomics.add(length, 0, 1)
      })
    }

    postMessage({ type: 'exit', data: new TextDecoder().decode(strBuffer.slice(0, Atomics.load(length, 0))) })
  }
}
