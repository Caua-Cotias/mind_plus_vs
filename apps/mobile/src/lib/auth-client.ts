import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { createAuthFlow, verificationCallbackURL } from "./auth-flow";
import { apiBaseURL } from './api-origin';

export const authClient = createAuthClient({
  baseURL: `${apiBaseURL}/api/auth`,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [
    expoClient({
      scheme: "mindplus",
      storagePrefix: "mind-plus-auth",
      storage: SecureStore,
    }),
  ],
});

export const authFlow = createAuthFlow({
  signIn: (credentials) => authClient.signIn.email(credentials),
  signUp: (details) => authClient.signUp.email({ ...details, callbackURL: verificationCallbackURL }),
  sendVerificationEmail: (email, callbackURL) => authClient.sendVerificationEmail({ email, callbackURL }),
  getSession: () => authClient.getSession(),
  signOut: () => authClient.signOut(),
});
