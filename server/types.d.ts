// Type declarations to fix compilation issues
declare module 'vite' {
  export function defineConfig(config: any): any;
  export function createServer(options?: any): Promise<any>;
  export function createLogger(): any;
  
  interface ServerOptions {
    allowedHosts?: boolean | string[] | true;
  }
}