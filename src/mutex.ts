import { isBrowserMainThread } from './util.js'

const _mutexBuffer = new WeakMap<Mutex, Int32Array | BigInt64Array>()
export const _unlockTokenBuffer = new WeakMap<UnlockToken, Int32Array | BigInt64Array | null>()

export class UnlockToken {
  constructor () {
    _unlockTokenBuffer.set(this, null)
  }

  get locked (): boolean {
    const buffer = _unlockTokenBuffer.get(this)
    if (!buffer) {
      return false
    }

    return Boolean(Atomics.load(buffer as any, 0))
  }

  unlock (): boolean {
    const buffer = _unlockTokenBuffer.get(this)
    if (!buffer) {
      return false
    }

    if (buffer.BYTES_PER_ELEMENT === 8) {
      if (Atomics.compareExchange(buffer as BigInt64Array, 0, BigInt(1), BigInt(0)) !== BigInt(1)) {
        return false
      }
      Atomics.notify(buffer as BigInt64Array, 0, 1)
    } else {
      if (Atomics.compareExchange(buffer as Int32Array, 0, 1, 0) !== 1) {
        return false
      }
      Atomics.notify(buffer as Int32Array, 0, 1)
    }
    _unlockTokenBuffer.set(this, null)
    return true
  }

  dispose (): void {
    this.unlock()
  }

  // @ts-ignore
  [Symbol.dispose] (): void
}

if (typeof Symbol.dispose === 'symbol') {
  Object.defineProperty(UnlockToken.prototype, Symbol.dispose, {
    value: UnlockToken.prototype.dispose,
    configurable: true,
    enumerable: false,
    writable: true
  })
}

export class Mutex {
  constructor (buffer: Int32Array | BigInt64Array) {
    if (buffer.BYTES_PER_ELEMENT !== 4 && buffer.BYTES_PER_ELEMENT !== 8) {
      throw new TypeError('Invalid buffer type')
    }
    _mutexBuffer.set(this, buffer)
  }

  /**
   * Attempt to acquire the lock on mutex.
   *
   * If the mutex is already locked, this blocks the agent until the lock is
   * acquired.
   *
   * If unlockToken is not undefined, it must be an empty UnlockToken.
   *
   * If unlockToken is undefined, returns a new UnlockToken.
   * Otherwise return the unlockToken that was passed in.
   */
  static lock (mutex: Mutex, unlockToken?: UnlockToken): UnlockToken {
    return this.lockIfAvailable(mutex, Infinity, unlockToken)!
  }

  /**
   * Attempt to acquire the lock on mutex.
   *
   * If timeout is not Infinity, only block for timeout milliseconds. If
   * the operation timed out without acquiring the lock, returns
   * null.
   *
   * If timeout is 0, returns immediately without blocking if the lock
   * cannot be acquired.
   *
   * unlockToken behaves as it does in the lock method.
   */
  static lockIfAvailable (mutex: Mutex, timeout: number, unlockToken?: UnlockToken): UnlockToken | null {
    if (typeof timeout !== 'number') {
      throw new TypeError('Invalid timeout')
    }
    timeout = Number.isNaN(timeout) ? Infinity : Math.max(timeout, 0)

    const buffer = _mutexBuffer.get(mutex)
    if (!buffer) {
      throw new TypeError('Invalid mutex')
    }

    const index = 0
    const start = isFinite(timeout) ? Date.now() : 0
    
    const expected = buffer.BYTES_PER_ELEMENT === 8 ? BigInt(0) as unknown as number : 0
    const replacement = buffer.BYTES_PER_ELEMENT === 8 ? BigInt(1) as unknown as number : 1

    if (isBrowserMainThread) {
      do {
        if (expected === Atomics.compareExchange(buffer as Int32Array, index, expected, replacement)) {
          break
        }
        if (isFinite(timeout) && Date.now() - start >= timeout) {
          return null
        }
      } while (true)
    } else {
      do {
        const result = Atomics.compareExchange(buffer as Int32Array, index, expected, replacement)
        if (expected === result) {
          break
        }
        if (timeout === 0 || Atomics.wait(buffer as Int32Array, index, result, timeout) === 'timed-out') {
          return null
        }
        if (isFinite(timeout)) {
          timeout = Math.max(timeout - (Date.now() - start), 0)
        }
      } while (true)
    }

    if (!unlockToken) {
      unlockToken = new UnlockToken()
    } else {
      if (unlockToken.locked) {
        throw new TypeError('UnlockToken is already locked')
      }
    }
    _unlockTokenBuffer.set(unlockToken, buffer)

    return unlockToken
  }
}
