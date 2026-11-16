import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createAuthFlow, verificationCallbackURL } from "./auth-flow";

function resolveApiBaseURL(): string {
  const configuredURL = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredURL) return configuredURL.replace(/\/$/, "");

  if (Platform.OS === "android" && !Device.isDevice) {
    return "http://10.0.2.2:3000";
  }

  // Expo Go exposes the Metro host, which is also reachable by a physical
  // device on the same network. Development builds should set the env variable.
  const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
  if (Device.isDevice && expoHost && expoHost !== "localhost") {
    return `http://${expoHost}:3000`;
  }

  return "http://localhost:3000";
}

const apiBaseURL = resolveApiBaseURL();

export const authClient = createAuthClient({
  baseURL: `${apiBaseURL.replace(/\/$/, "")}/api/auth`,
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
