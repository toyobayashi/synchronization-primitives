if (typeof process === 'object' && process !== null && process.versions && process.versions.node) {
  const { Worker: NodeWorker, parentPort } = await import('worker_threads')

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

  class Worker extends NodeWorker {
    constructor(filename, options = {}) {
      // options.workerData ??= {};
      // options.workerData.__ts_worker_filename = filename.toString();
      // super(new URL(`data:text/javascript,${worker}`), options);
      super(filename, options);

      this._eventMap = Object.create(null);

      this.__onmessage = (e) => {
        this._onmessage?.({ data: e });
      }

      this.__onmessageerror = (e) => {
        this._onmessageerror?.(e);
      };

      this.__onerror = (e) => {
        this._onerror?.(e);
      };
    }

    get onmessage() {
      return this._onmessage;
    }

    set onmessage (f) {
      const _onmessage = this._onmessage;
      this._onmessage = f;
      if (!_onmessage && f) {
        this.on('message', this.__onmessage);
      } else if (_onmessage && !f) {
        this.off('message', this.__onmessage);
      }
    }

    get onmessageerror() {
      return this._onmessageerror;
    }

    set onmessageerror(f) {
      const _onmessageerror = this._onmessageerror;
      this._onmessageerror = f;
      if (!_onmessageerror && f) {
        this.on('messageerror', this.__onmessageerror);
      } else if (_onmessageerror && !f) {
        this.off('messageerror', this.__onmessageerror);
      }
    }

    get onerror() {
      return this._onerror;
    }

    set onerror(f) {
      const _onerror = this._onerror;
      this._onerror = f;
      if (!_onerror && f) {
        this.on('error', this.__onerror);
      } else if (_onerror && !f) {
        this.off('error', this.__onerror);
      }
    }

    addEventListener(type, listener, options) {
      this._eventMap[type] = this._eventMap[type] ?? new Map();
      if (this._eventMap[type].has(listener)) {
        return;
      }
      const once = Boolean(options?.once);
      let fn
      if (type === 'message') {
        fn = once ? function (data) {
          this._eventMap[type].delete(listener);
          listener({ data });
        } : function (data) {
          listener({ data });
        }
      } else {
        fn = once ? function (e) {
          this._eventMap[type].delete(listener);
          listener(e);
        } : function (e) {
          listener(e);
        }
      }
      this._eventMap[type].set(listener, fn);
      if (once) {
        this.once(type, fn);
      } else {
        this.on(type, fn);
      }
    }

    removeEventListener(type, listener) {
      if (!this._eventMap[type]) {
        return;
      }
      const fn = this._eventMap[type].get(listener);
      if (!fn) {
        return;
      }
      this.off(type, fn);
      this._eventMap[type].delete(listener);
    }
  }

  Object.assign(globalThis, {
    self: globalThis,
    postMessage: function (msg) {
      parentPort?.postMessage(msg)
    },
    Worker
  });
}
