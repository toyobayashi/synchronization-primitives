/* export const isLockFree = typeof Atomics.isLockFree === 'function' ? Atomics.isLockFree : function isLockFree (size: number): boolean {
  return size === 1 || size === 2 || size === 4 || size === 8
} */

export type BufferView = Int32Array | BigInt64Array

export function isBigInt64Array (view: unknown): view is BigInt64Array {
  try {
    return view instanceof BigInt64Array
  } catch (_) {
    return false
  }
}

export function isInt32Array (view: unknown): view is Int32Array {
  return view instanceof Int32Array
}

export function assertBufferView (view: unknown): void {
  if (!isInt32Array(view) && !isBigInt64Array(view)) {
    throw new TypeError(`${Object.prototype.toString.call(view)} is not an int32 or BigInt64 typed array.`)
  }
}

export const isBrowserMainThread = /*#__PURE__*/ (function () {
  if (typeof SharedArrayBuffer === 'function') {
    try {
      if ('timed-out' === Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 0)) {
        return false
      }
      return true
    } catch (_) {
      return true
    }
  }
  return typeof window !== 'undefined' && typeof document !== 'undefined'
})()

// export function wait (view: Int32Array, index: number, value: number, timeout?: number): "ok" | "not-equal" | "timed-out"
// export function wait (view: BigInt64Array, index: number, value: bigint, timeout?: number): "ok" | "not-equal" | "timed-out"
export const wait: {
  (view: Int32Array, index: number, value: number, timeout?: number): "ok" | "not-equal" | "timed-out"
  (view: BigInt64Array, index: number, value: bigint, timeout?: number): "ok" | "not-equal" | "timed-out"
} = isBrowserMainThread
  ? function (view: any, index: number, value: any, timeout?: number): "ok" | "not-equal" | "timed-out" {
      if (Atomics.load(view, index) !== value) {
        return "not-equal"
      }
      timeout = isNaN(timeout) ? Infinity : Math.max(timeout, 0)
      if (timeout === 0) {
        return "timed-out"
      }
      const finite = isFinite(timeout)
      const start = finite ? Date.now() : 0
      do {
        if (Atomics.load(view, index) !== value) {
          return "ok"
        }
        if (finite && Date.now() - start >= timeout) {
          return "timed-out"
        }
      } while (true)
    }
  : Atomics.wait
