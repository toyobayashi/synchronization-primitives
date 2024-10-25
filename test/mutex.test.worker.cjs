if (typeof process === 'object' && process !== null && process.versions && process.versions.node) {
  const nodeWorkerThreads = require('worker_threads')

  const parentPort = nodeWorkerThreads.parentPort

  parentPort.on('message', (data) => {
    globalThis.onmessage({ data })
  })

  Object.assign(globalThis, {
    self: globalThis,
    postMessage: function (msg) {
      parentPort.postMessage(msg)
    }
  })
}

self.onmessage = async function (e) {
  const { Counter } = await import('./counter.js')
  const { type, iteration, buffer } = e.data
  const counter = new Counter(buffer)
  for (let i = 0; i < iteration; ++i) {
    counter[type]()
  }
  postMessage('done')
}
