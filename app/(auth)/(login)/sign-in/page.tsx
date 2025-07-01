import { redirect } from "next/navigation";
import { Login } from "../login";
import { getUser } from "@/app/lib/user";

export default async function SignInPage() {
  const user = await getUser();
  if (user) {
    return redirect("/");
  }

  return <Login mode="signin" />;
}
