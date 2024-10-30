import { wait, type BufferView, isBigInt64Array, assertBufferView } from './util.js'

const _mutexBuffer = new WeakMap<Mutex, BufferView>()
const _unlockTokenBuffer = new WeakMap<UnlockToken, BufferView | null>()

export function getUnlockTokenBuffer (unlockToken: UnlockToken): BufferView | null {
  return _unlockTokenBuffer.get(unlockToken)
}

function isLocked (unlockToken: UnlockToken): boolean {
  return getUnlockTokenBuffer(unlockToken) !== null
}

/** @public */
export class UnlockToken {
  constructor () {
    _unlockTokenBuffer.set(this, null)
  }

  get locked (): boolean {
    return isLocked(this)
  }

  unlock (): boolean {
    const buffer = getUnlockTokenBuffer(this)
    if (!buffer) {
      return false
    }

    const [expected, replacement] = isBigInt64Array(buffer) ? [BigInt(1), BigInt(0)] : [1, 0]

    if (Atomics.compareExchange(buffer as Int32Array, 0, expected as number, replacement as number) !== expected) {
      return false
    }
    _unlockTokenBuffer.set(this, null)
    Atomics.notify(buffer as any, 0, 1)
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

/** @public */
export class Mutex {
  constructor (buffer: BufferView) {
    assertBufferView(buffer)
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
    if (!(mutex instanceof Mutex)) {
      throw new TypeError(`${Object.prototype.toString.call(mutex)} is not a Mutex`)
    }
    const buffer = _mutexBuffer.get(mutex)
    return tryLock(buffer, Infinity, unlockToken)!
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
    if (!(mutex instanceof Mutex)) {
      throw new TypeError(`${Object.prototype.toString.call(mutex)} is not a Mutex`)
    }
    const buffer = _mutexBuffer.get(mutex)
    return tryLock(buffer, timeout, unlockToken)
  }
}

export function tryLock (buffer: BufferView, timeout: number, unlockToken?: UnlockToken): UnlockToken | null {
  timeout = isNaN(timeout) ? Infinity : Math.max(timeout, 0)
  const index = 0
  const finite = isFinite(timeout)
  if (unlockToken == null) {
    unlockToken = new UnlockToken()
  } else {
    if (!(unlockToken instanceof UnlockToken)) {
      throw new TypeError(`${Object.prototype.toString.call(unlockToken)} is not an UnlockToken`)
    }

    if (isLocked(unlockToken)) {
      throw new Error('UnlockToken is not empty')
    }
  }

  const [expected, replacement] = isBigInt64Array(buffer) ? [BigInt(0), BigInt(1)] : [0, 1]
  const start = finite ? Date.now() : 0

  do {
    const result = Atomics.compareExchange(buffer as Int32Array, index, expected as number, replacement as number)
    if (expected === result) {
      break
    }
    if (wait(buffer as Int32Array, index, result, timeout) === 'timed-out') {
      return null
    }
    if (finite) {
      timeout = Math.max(timeout - (Date.now() - start), 0)
    }
  } while (true)

  _unlockTokenBuffer.set(unlockToken, buffer)

  return unlockToken
}
