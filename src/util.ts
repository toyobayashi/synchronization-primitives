/* export const isLockFree = typeof Atomics.isLockFree === 'function' ? Atomics.isLockFree : function isLockFree (size: number): boolean {
  return size === 1 || size === 2 || size === 4 || size === 8
} */

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
