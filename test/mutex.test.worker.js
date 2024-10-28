import './worker-polyfill.js'
import { Mutex } from '../lib/mutex.js'
import { Counter } from './counter.js'

self.onmessage = function (e) {
  const { type, iteration, buffer } = e.data
  const counter = new Counter(Mutex, buffer)
  for (let i = 0; i < iteration; ++i) {
    counter[type]()
  }
  postMessage('exit')
}
