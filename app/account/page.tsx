import { redirect } from "next/navigation";
import AccountForm from "../components/Account";
import { getCurrentProfile } from "@/app/data/users";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UserPage() {
  const user = await getCurrentProfile();
  if (!user) {
    return redirect("/");
  }

  return <AccountForm user={user} />;
}
