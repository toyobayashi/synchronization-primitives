declare module '*?worker' {
  export default function WorkerWrapper (options?: WorkerOptions): Worker
}
