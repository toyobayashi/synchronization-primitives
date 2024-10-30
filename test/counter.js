export class Counter {
  #valueView

  constructor (useBigInt, Mutex, buffer) {
    this.buffer = buffer ?? new SharedArrayBuffer(useBigInt ? 16 : 8)
    this.#valueView = new Int32Array(this.buffer, 0, 1)

    class LocableMutex extends Mutex {
      constructor (buffer) {
        super(buffer)
      }

      lock () {
        return Mutex.lock(this)
      }
    }

    this.mutex = new LocableMutex(useBigInt ? new BigInt64Array(this.buffer, 8, 1) : new Int32Array(this.buffer, 4, 1))
  }

  get value () {
    return this.#valueView[0]
  }

  set value (value) {
    this.#valueView[0] = value
  }

  increase () {
    const lock = this.mutex.lock()
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
