import { createClient } from "@/utils/supabase/server";
import AccountForm from "../components/Account";

export default async function Account() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AccountForm user={user} />;
}
