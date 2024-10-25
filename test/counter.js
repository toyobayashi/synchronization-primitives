import { Mutex } from "../lib/mutex.js"

export class Counter {
  #valueView

  constructor (buffer) {
    this.buffer = buffer ?? new SharedArrayBuffer(8)
    this.#valueView = new Int32Array(this.buffer, 0, 1)
    this.mutex = new Mutex(new Int32Array(this.buffer, 4, 1))
  }

  get value () {
    return this.#valueView[0]
  }

  set value (value) {
    this.#valueView[0] = value
  }

  increase () {
    const lock = Mutex.lock(this.mutex)
    try {
      this.value++
    } finally {
      lock[Symbol.dispose]()
    }
  }

  unsafeIncrease () {
    this.value++
  }
}
