import { getCurrentUser } from "@/domain/auth/auth";
import { Login } from "../login";
import { redirect } from "next/navigation";

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) {
    return redirect("/");
  }

  return <Login mode="signup" />;
}
