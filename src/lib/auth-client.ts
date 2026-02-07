import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Use relative URL to avoid CORS issues
  baseURL: typeof window !== "undefined" ? window.location.origin : "https://www.sparebox.dev",
});

export const { signIn, signUp, signOut, useSession } = authClient;
