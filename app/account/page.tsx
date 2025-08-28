import AccountForm from "../components/Account";
import { getCurrentUser } from "@/app/data/users";

export default async function UserPage() {
  const profile = await getCurrentUser();

  return <AccountForm user={profile} />;
}
