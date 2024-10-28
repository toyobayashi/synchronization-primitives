export function createTestWorker (url: string | URL, options: WorkerOptions): { worker: Worker, promise: Promise<void> } {
  const worker = new Worker(url, options);
  let terminated = false
  const promise = new Promise<void>((resolve, reject) => {
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
        worker.onmessage = null
        worker.terminate()
      }
    }
  })
  return { worker, promise }
}
