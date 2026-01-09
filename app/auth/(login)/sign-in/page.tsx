import { redirect } from "next/navigation";
import { Login } from "@/app/auth/(login)/login";
import { getCurrentUser } from "@/domain/auth/auth";

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) {
    return redirect("/");
  }

  return <Login mode="signin" />;
}
