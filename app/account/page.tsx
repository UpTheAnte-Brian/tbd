// app/account/page.tsx
"use client";

import AccountForm from "../components/Account";
import { useUser } from "@/app/hooks/useUser";

export default function Account() {
  const { user, loading } = useUser();

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>You must be signed in</p>;

  return <AccountForm user={user} />;
}
