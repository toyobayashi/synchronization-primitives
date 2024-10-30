// import { deepMerge } from './deep_merge.ts'

export function createTestWorker<T = any> (url: string | URL, options: WorkerOptions): { worker: Worker, promise: Promise<T> } {
  const worker = new Worker(url, options);
  return { worker, promise: promisifyTestWorker(worker) }
}

export function promisifyTestWorker<T = any> (worker: Worker): Promise<T> {
  let terminated = false
  const promise = new Promise<T>((resolve, reject) => {
    worker.onerror = (e) => {
      if (terminated) return
      terminated = true
      reject(e)
      worker.onerror = null
      worker.terminate()
    }
    worker.onmessage = (e) => {
      if (terminated) return
      if (e.data === 'exit' || (e.data && e.data.type === 'exit')) {
        terminated = true
        resolve(e.data?.data)
        // if (globalThis.__VITEST_COVERAGE__ && e.data?.__VITEST_COVERAGE__) {
        //   globalThis.__VITEST_COVERAGE__ = deepMerge(globalThis.__VITEST_COVERAGE__, e.data.__VITEST_COVERAGE__)
        // }
        worker.onmessage = null
        worker.terminate()
      }
    }
  })
  return promise
}
