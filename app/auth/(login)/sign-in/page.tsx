import { redirect } from "next/navigation";
import { Login } from "@/app/auth/(login)/login";
import { getCurrentUser } from "@/app/data/auth";

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) {
    return redirect("/");
  }

  return <Login mode="signin" />;
}
