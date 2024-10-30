import { type UnlockToken, tryLock, getUnlockTokenBuffer } from './mutex.js'
import { assertBufferView, isBigInt64Array, wait, type BufferView } from './util.js'

const _conditionBuffer = new WeakMap<Condition, BufferView>()

export class Condition {
  constructor (buffer: BufferView) {
    assertBufferView(buffer)
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
    tryWait(cv, unlockToken, Infinity)
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
    return tryWait(cv, unlockToken, timeout, predicate)
  }

  /**
   * Notifies count waiters waiting on the condition variable cv.
   *
   * Returns the number of waiters that were notified.
   */
  static notify (cv: Condition, count: number = Infinity): number {
    if (!(cv instanceof Condition)) {
      throw new TypeError(`${Object.prototype.toString.call(cv)} is not a Condition.`)
    }
    count = isNaN(count) ? Infinity : Math.max(count, 1)
    const buffer = _conditionBuffer.get(cv)
    Atomics.add(buffer as Int32Array, 0, (isBigInt64Array(buffer) ? BigInt(1) : 1) as number)
    return Atomics.notify(buffer as Int32Array, 0, count)
  }
}

function tryWait (cv: Condition, unlockToken: UnlockToken, timeout: number, predicate?: () => boolean): boolean {
  if (!(cv instanceof Condition)) {
    throw new TypeError(`${Object.prototype.toString.call(cv)} is not a Condition.`)
  }

  const lockBuffer = getUnlockTokenBuffer(unlockToken)
  if (!lockBuffer) {
    throw new Error('Empty UnlockToken')
  }

  const buffer = _conditionBuffer.get(cv)
  timeout = isNaN(timeout) ? Infinity : Math.max(timeout, 0)
  const finite = isFinite(timeout)
  const start = finite ? Date.now() : 0

  while (predicate ? !predicate() : true) {
    const value = Atomics.load(buffer as Int32Array, 0)
    if (!unlockToken.unlock()) {
      throw new TypeError('Invalid unlock token')
    }
    const result = wait(buffer as Int32Array, 0, value, timeout)
    tryLock(lockBuffer, Infinity, unlockToken)
    if (result === 'not-equal') {
      throw new TypeError('Illegal state')
    }
    if (result === 'timed-out') {
      return false
    }
    if (!predicate) break
    if (finite) {
      timeout -= Date.now() - start
      if (timeout <= 0) {
        return predicate()
      }
    }
  }
  return true
}
