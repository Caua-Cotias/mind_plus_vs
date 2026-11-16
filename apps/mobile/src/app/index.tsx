import { Redirect } from "expo-router";

import { authClient } from "@/lib/auth-client";

export default function IndexRoute() {
  const { data: session } = authClient.useSession();
  return <Redirect href={session ? "/home" : "/welcome"} />;
}
