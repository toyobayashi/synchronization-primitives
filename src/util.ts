/* export const isLockFree = typeof Atomics.isLockFree === 'function' ? Atomics.isLockFree : function isLockFree (size: number): boolean {
  return size === 1 || size === 2 || size === 4 || size === 8
} */

export const isBrowserMainThread = typeof window !== 'undefined' && typeof document !== 'undefined'
