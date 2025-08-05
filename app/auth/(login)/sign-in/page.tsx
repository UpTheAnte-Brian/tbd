import { redirect } from "next/navigation";
import { getUser } from "@/app/lib/user";
import { Login } from "@/app/auth/(login)/login";

export default async function SignInPage() {
  const user = await getUser();
  if (user) {
    return redirect("/");
  }

  return <Login mode="signin" />;
}
