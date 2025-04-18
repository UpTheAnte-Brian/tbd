import { createClient } from "@supabase/supabase-js";

const UsersPage = async () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: {
        schema: "next_auth",
      },
    }
  );

  const { data } = await supabase.from("users").select("*");
  return <div>{JSON.stringify(data)}</div>;
};

export default UsersPage;

// const UsersPage = () => {
//   return <div>Users Page</div>;
// }
// export default UsersPage;
