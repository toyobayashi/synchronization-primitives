import './worker-polyfill.js'
import { Mutex, Condition } from '../lib/index.js'

self.onmessage = function (e) {
  const { type, iteration, buffer, payload } = e.data

  const count = new Int32Array(buffer, 0, 1)
  const mutex = new Mutex(new Int32Array(buffer, 4, 1))
  const condition = new Condition(new Int32Array(buffer, 8, 1))

  if (type === 'init-counter') {
    for (let i = 0; i < iteration; ++i) {
      const lock = Mutex.lock(mutex)
      try {
        count[0] = count[0] + 1
        if (count[0] === payload) {
          Condition.notify(condition, 1)
        }
      } finally {
        lock[Symbol.dispose]()
      }
    }
    postMessage('exit')
  } else if (type === 'init-watcher') {
    const lock = Mutex.lock(mutex)
    try {
      while (count[0] < payload) {
        Condition.wait(condition, lock)
      }
      count[0] = count[0] - payload
    } finally {
      lock[Symbol.dispose]()
    }
    postMessage('exit')
  }
}
