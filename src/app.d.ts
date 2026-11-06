// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
type AuthUser = {
  id: string;
  email: string;
  name: string;
  username?: string;
  user_type?: string | string[];
  roles?: string[];
  isAdmin?: boolean;
};

declare global {
  namespace App {
    interface Locals {
      user?: AuthUser | null;
    }
    interface PageData {
      user?: AuthUser | null;
    }
    // interface Error {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
