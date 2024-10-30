import './worker-polyfill.js'
import { Mutex } from '../lib/index.js'
import { Counter } from './counter.js'

self.onmessage = function (e) {
  const { type, iteration, buffer, useBigInt } = e.data
  const counter = new Counter(useBigInt, Mutex, buffer)
  for (let i = 0; i < iteration; ++i) {
    counter[type]()
  }
  postMessage('exit')
}
