"use server";
import { createClient } from "@/utils/supabase/server";

const UsersPage = async () => {
  const supabase = await createClient();
  // Check if the session exists
  // if (!session) {
  //   return <div>Please log in to view this page.</div>;
  // }

  // Access the supabaseAccessToken
  // const supabaseAccessToken = session.supabaseAccessToken;

  // const supabase = createClient<Database>(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  //   {
  //     global: {
  //       headers: {
  //         Authorization: `Bearer ${supabaseAccessToken}`,
  //       },
  //     },
  //     // db: {
  //     //   schema: "next_auth",
  //     // },
  //   }
  // );

  const { data: Session, error } = await supabase.from("users").select("*");

  if (error) {
    return <div>Error fetching users: {error.message}</div>;
  }

  return <div>{JSON.stringify(Session)}</div>;
};

export default UsersPage;

// const UsersPage = () => {
//   return <div>Users Page</div>;
// }
// export default UsersPage;
