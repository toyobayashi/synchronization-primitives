// import type { WorkerOptions } from 'worker_threads'

let W

if (typeof window === 'undefined') {
  // Node.js
  const { Worker: NodeWorker } = require('worker_threads')

  const worker = /* JavaScript */ `
  import { createRequire } from "node:module";
  import { workerData } from "node:worker_threads";

  const filename = "${__filename}";
  const require = createRequire(filename);
  const { tsImport } = require("tsx/esm/api");
  
  tsImport(workerData.__ts_worker_filename, filename);
`;

W = class extends NodeWorker {
    constructor(filename, options = {}) {
      // options.workerData ??= {};
      // options.workerData.__ts_worker_filename = filename.toString();
      // super(new URL(`data:text/javascript,${worker}`), options);
      super(filename, options);

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
      this._onmessage = f;
      if (f) {
        this.on('message', this.__onmessage);
      } else {
        this.off('message', this.__onmessage);
      }
    }

    get onmessageerror() {
      return this._onmessageerror;
    }

    set onmessageerror(f) {
      this._onmessageerror = f;
      if (f) {
        this.on('messageerror', this.__onmessageerror);
      } else {
        this.off('messageerror', this.__onmessageerror);
      }
    }

    get onerror() {
      return this._onerror;
    }

    set onerror(f) {
      this._onerror = f;
      if (f) {
        this.on('error', this.__onerror);
      } else {
        this.off('error', this.__onerror);
      }
    }
  }
} else {
  W = window.Worker
}

export { W as Worker }
