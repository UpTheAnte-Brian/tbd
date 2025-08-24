import AccountForm from "../../components/Account";
import { useUserById } from "@/app/hooks/useUserById";

export default async function UserPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  // page.tsx
  const profile = useUserById(params.id);

  return <AccountForm user={profile.user} />;
}
