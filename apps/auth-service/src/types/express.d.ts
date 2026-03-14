declare global {
  namespace Express {
    interface User {
      sub: string;
      email?: string;
      [key: string]: unknown;
    }
  }
}

export {};
