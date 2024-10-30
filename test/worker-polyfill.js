if (typeof process === 'object' && process !== null && process.versions && process.versions.node) {
  const {
    0: {
      Worker: NodeWorker,
      parentPort
    },
    1: {
      join,
      dirname
    },
    2: {
      existsSync
    },
    3: {
      fileURLToPath
    }
  } = await Promise.all([
    import('worker_threads'),
    import('path'),
    import('fs'),
    import('url')
  ])
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  /* const worker = `
  import { createRequire } from "node:module";
  import { workerData } from "node:worker_threads";

  const filename = "${__filename}";
  const require = createRequire(filename);
  const { tsImport } = require("tsx/esm/api");
  
  tsImport(workerData.__ts_worker_filename, filename);
`; */

  if (parentPort) {
    parentPort.on('message', (data) => {
      if (typeof onmessage === 'function') {
        onmessage.call(globalThis, { data })
      }
    })
  }

  const _eventInit = new WeakMap();
  class ErrorEvent extends Event {
    constructor (type, init) {
      super(type, init);
      _eventInit.set(this, init);
    }

    get colno () {
      return _eventInit.get(this)?.colno;
    }

    get error () {
      return _eventInit.get(this)?.error;
    }

    get filename () {
      return _eventInit.get(this)?.filename;
    }

    get lineno () {
      return _eventInit.get(this)?.lineno;
    }

    get message () {
      return _eventInit.get(this)?.message;
    }
  }

  const _worker = new WeakMap();
  const _onerror = new WeakMap();
  const _onmessage = new WeakMap();
  const _onmessageerror = new WeakMap();

  class Worker extends EventTarget {
    constructor(filename, options = {}) {
      super()

      if (typeof filename === 'string' && filename.startsWith('/')) {
        const absolutePath = join(__dirname, '..', filename);
        const url = new URL(`file://${absolutePath}`)
        if (existsSync(url)) {
          filename = url
        } else {
          filename = new URL(`file://${filename}`);
        }
      }

      // options.workerData ??= {};
      // options.workerData.__ts_worker_filename = filename.toString();
      // const nodeWorker = new NodeWorker(new URL(`data:text/javascript,${worker}`), options);
      const nodeWorker = new NodeWorker(filename, options);
      _worker.set(this, nodeWorker);

      _onerror.set(this, null);
      _onmessage.set(this, null);
      _onmessageerror.set(this, null);

      nodeWorker.on('error', (e) => {
        const event = new ErrorEvent('error', {
          error: e,
          message: e.message
        });
        this.dispatchEvent(event);
      })

      nodeWorker.on('message', (data) => {
        const event = new MessageEvent('message', {
          data
        });
        this.dispatchEvent(event);
      });

      nodeWorker.on('messageerror', (e) => {
        const event = new MessageEvent('messageerror', {
          data: e
        });
        this.dispatchEvent(event);
      });
    }

    postMessage (...args) {
      const nodeWorker = _worker.get(this);
      nodeWorker.postMessage(...args);
    }

    terminate () {
      const nodeWorker = _worker.get(this);
      nodeWorker.terminate();
    }

    ref () {
      const nodeWorker = _worker.get(this);
      nodeWorker.ref();
    }

    unref () {
      const nodeWorker = _worker.get(this);
      nodeWorker.unref();
    }

    get onmessage() {
      return _onmessage.get(this);
    }

    set onmessage(f) {
      if (typeof f !== 'function' && f !== null) f = null
      const old = _onmessage.get(this);
      _onmessage.set(this, f);
      if (f === old) return;
      if (old) this.removeEventListener('message', old)
      if (f) this.addEventListener('message', f)
    }

    get onmessageerror() {
      return _onmessageerror.get(this);
    }

    set onmessageerror(f) {
      if (typeof f !== 'function' && f !== null) f = null
      const old = _onmessageerror.get(this);
      _onmessageerror.set(this, f);
      if (f === old) return;
      if (old) this.removeEventListener('messageerror', old)
      if (f) this.addEventListener('messageerror', f)
    }

    get onerror() {
      return _onerror.get(this);
    }

    set onerror(f) {
      if (typeof f !== 'function' && f !== null) f = null
      const old = _onerror.get(this);
      _onerror.set(this, f);
      if (f === old) return;
      if (old) this.removeEventListener('error', old)
      if (f) this.addEventListener('error', f)
    }
  }

  Object.defineProperty(Worker, Symbol.toStringTag, {
    value: 'Worker',
    writable: false,
    enumerable: false,
    configurable: true
  })

  Object.assign(globalThis, {
    self: globalThis,
    postMessage: function (...args) {
      parentPort?.postMessage(...args)
    },
    Worker,
    ErrorEvent
  });
}

/* const postMessage = globalThis.postMessage
globalThis.postMessage = function (...args) {
  if (args[0] === 'exit') {
    if (typeof __VITEST_COVERAGE__ === 'object' && __VITEST_COVERAGE__ !== null) {
      return postMessage.call(globalThis, {
        type: 'exit',
        __VITEST_COVERAGE__
      }, ...args.slice(1))
    }
  } else if (args[0].type === 'exit') {
    if (typeof __VITEST_COVERAGE__ === 'object' && __VITEST_COVERAGE__ !== null) {
      args[0].__VITEST_COVERAGE__ = __VITEST_COVERAGE__
    }
  }
  return postMessage.call(globalThis, ...args)
} */
