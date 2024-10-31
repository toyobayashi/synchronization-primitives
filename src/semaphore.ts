import { wait, isInt32Array } from "./util.js"

const _semaphoreBuffer = new WeakMap<Semaphore, Int32Array>()

export class Semaphore {
  static max (): number {
    return 4294967295
  }

  constructor (buffer: Int32Array) {
    if (!isInt32Array(buffer)) {
      throw new TypeError(`${Object.prototype.toString.call(buffer)} is not an Int32Array.`)
    }
    _semaphoreBuffer.set(this, buffer)
  }

  get value (): number {
    const buffer = _semaphoreBuffer.get(this)
    return Atomics.load(new Uint32Array(buffer.buffer, buffer.byteOffset, 1), 0)
  }

  static tryAquire (sem: Semaphore, num: number = 1): number {
    if (!(sem instanceof Semaphore)) {
      throw new TypeError(`${Object.prototype.toString.call(sem)} is not a Semaphore.`)
    }
    num = isNaN(num) ? 1 : Math.max(num, 0)
    const buffer = _semaphoreBuffer.get(sem)
    const u32array = new Uint32Array(buffer.buffer, buffer.byteOffset, 1)
    let val = Atomics.load(u32array, 0)
    if (num === 0) return val
    do {
      const replacement = val - num
      const ret = Atomics.compareExchange(u32array, 0, val, replacement)
      if (ret === val) return replacement
      if (ret < num) return -1
      val = ret
    } while (true)
  }

  static tryAcquireFor (sem: Semaphore, timeout: number, num: number = 1): number {
    return tryAcquireFor(sem, timeout, num)
  }

  static acquire (sem: Semaphore, num: number = 1): number {
    return tryAcquireFor(sem, Infinity, num)
  }

  static release (sem: Semaphore, update: number = 1): number {
    if (!(sem instanceof Semaphore)) {
      throw new TypeError(`${Object.prototype.toString.call(sem)} is not a Semaphore.`)
    }
    update = isNaN(update) ? 1 : Math.max(update, 0)
    const buffer = _semaphoreBuffer.get(sem)
    const u32array = new Uint32Array(buffer.buffer, buffer.byteOffset, 1)
    const val = Atomics.load(u32array, 0)
    if (update === 0) return val
    if (update > this.max() - val) {
      throw new RangeError('Semaphore value too large.')
    }
    const current = Atomics.add(u32array, 0, update)
    Atomics.notify(buffer, 0, update)
    return current
  }
}

function tryAcquireFor (sem: Semaphore, timeout: number, num: number): number {
  if (!(sem instanceof Semaphore)) {
    throw new TypeError(`${Object.prototype.toString.call(sem)} is not a Semaphore.`)
  }
  timeout = isNaN(timeout) ? Infinity : Math.max(timeout, 0)
  const finite = isFinite(timeout)
  num = isNaN(num) ? 1 : Math.max(num, 0)
  const buffer = _semaphoreBuffer.get(sem)
  const u32array = new Uint32Array(buffer.buffer, buffer.byteOffset, 1)
  let val = Atomics.load(u32array, 0)
  if (num === 0) return val

  const start = finite ? Date.now() : 0
  do {
    while (val < num) {
      const result = wait(buffer, 0, val, timeout)
      if (result === 'timed-out') return -1
      val = Atomics.load(u32array, 0)
      if (finite) {
        timeout = Math.max(timeout - (Date.now() - start), 0)
      }
    }
    const replacement = val - num
    const ret = Atomics.compareExchange(u32array, 0, val, replacement)
    if (ret === val) return replacement
    val = ret;
  } while (true)
}

export class BinarySemaphore extends Semaphore {
  static max (): number {
    return 1
  }
}
