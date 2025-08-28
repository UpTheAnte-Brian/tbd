// app/users/[id]/page.tsx
import { getUser } from "@/app/data/users";
import AccountForm from "@/app/components/Account";

export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await getUser((await params).id);

  return <AccountForm user={user} />;
}
