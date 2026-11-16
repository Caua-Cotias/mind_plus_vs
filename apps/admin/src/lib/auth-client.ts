"use client";

import { createAuthClient } from "better-auth/react";

const apiBaseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: `${apiBaseURL.replace(/\/$/, "")}/api/auth`,
  fetchOptions: {
    credentials: "include",
  },
});
