import { Mutex, type UnlockToken, _unlockTokenBuffer } from './mutex.js'
import { isBrowserMainThread } from './util.js'

const _conditionBuffer = new WeakMap<Condition, Int32Array | BigInt64Array>()

export class Condition {
  constructor (buffer: Int32Array | BigInt64Array) {
    if (buffer.BYTES_PER_ELEMENT !== 4 && buffer.BYTES_PER_ELEMENT !== 8) {
      throw new TypeError('Invalid buffer type')
    }
    _conditionBuffer.set(this, buffer)
  }

  /**
   * Atomically unlocks the unlockToken and blocks the current agent until cv
   * is notified.
   *
   * unlockToken must not be empty.
   *
   * When the agent is resumed, the lock underlying mutex in unlockToken is
   * reacquired, blocking if necessary.
   *
   * Returns undefined.
   */
  static wait (cv: Condition, unlockToken: UnlockToken): void {
    this.waitFor(cv, unlockToken, Infinity)
  }

  /**
   * Atomically unlocks the unlockToken and blocks the current agent until cv
   * is notified or timed out.
   *
   * unlockToken must not be empty.
   *
   * timeout is in milliseconds.
   *
   * If predicate is not undefined, this method returns after predicate returns
   * true, or if timed out. If timed out, the final return value of the
   * predicate is returned. Whenever the predicate is executing, the lock on the
   * underlying mutex of unlockToken is acquired.
   *
   * If predicate is undefined, returns true if the wait was notified, and false
   * if timed out.
   */
  static waitFor (cv: Condition, unlockToken: UnlockToken, timeout: number, predicate?: () => boolean): boolean {
    if (typeof timeout !== 'number') {
      throw new TypeError('Invalid timeout')
    }
    timeout = Number.isNaN(timeout) ? Infinity : Math.max(timeout, 0)

    if (!unlockToken.locked) {
      throw new TypeError('Invalid unlock token')
    }

    const buffer = _conditionBuffer.get(cv)
    if (!buffer) {
      throw new TypeError('Invalid condition variable')
    }

    const start = isFinite(timeout) ? Date.now() : 0

    if (isBrowserMainThread) {
      const lockBuffer = _unlockTokenBuffer.get(unlockToken)
      while (predicate ? !predicate() : true) {
        const value = Atomics.load(buffer as Int32Array, 0)
        if (!unlockToken.unlock()) {
          throw new TypeError('Invalid unlock token')
        }
        let isTimeout = false
        do {
          if (value !== Atomics.load(buffer as Int32Array, 0)) {
            break
          }
          if (isFinite(timeout) && Date.now() - start >= timeout) {
            isTimeout = true
            break
          }
        } while (true)
        Mutex.lock(new Mutex(lockBuffer), unlockToken)
        if (isTimeout) {
          return predicate ? predicate() : false
        }
        if (!predicate) break
      }
      return true
    }

    const lockBuffer = _unlockTokenBuffer.get(unlockToken)
    while (predicate ? !predicate() : true) {
      const value = Atomics.load(buffer as Int32Array, 0)
      if (!unlockToken.unlock()) {
        throw new TypeError('Invalid unlock token')
      }
      const result = Atomics.wait(buffer as Int32Array, 0, value, timeout)
      Mutex.lock(new Mutex(lockBuffer), unlockToken)
      if (result === 'not-equal') {
        throw new TypeError('Illegal state')
      }
      if (result === 'timed-out') {
        return false
      }
      if (!predicate) break
      if (isFinite(timeout)) {
        timeout -= Date.now() - start
        if (timeout <= 0) {
          return predicate()
        }
      }
    }
    return true
  }

  /**
   * Notifies count waiters waiting on the condition variable cv.
   *
   * Returns the number of waiters that were notified.
   */
  static notify (cv: Condition, count: number = Infinity): number {
    count = Number.isNaN(count) ? Infinity : Math.max(count, 1)
    const buffer = _conditionBuffer.get(cv)
    if (!buffer) {
      throw new TypeError('Invalid condition variable')
    }
    if (buffer.BYTES_PER_ELEMENT === 8) {
      Atomics.add(buffer as BigInt64Array, 0, BigInt(1))
    } else {
      Atomics.add(buffer as Int32Array, 0, 1)
    }
    return Atomics.notify(buffer as Int32Array, 0, count)
  }
}
