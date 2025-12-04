"use client";

import { ReactNode } from "react";
import { UserProvider } from "@/app/hooks/useUser";
import { Profile } from "@/app/lib/types/types";

export default function UserProviderClient({
  initialUser,
  children,
}: {
  initialUser: Profile | null;
  children: ReactNode;
}) {
  return <UserProvider initialUser={initialUser}>{children}</UserProvider>;
}
