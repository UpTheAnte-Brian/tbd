"use client";
// import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { Button } from "../ui/button";

import { usePathname } from "next/navigation";

export function SigninButton() {
  const pathname = usePathname();

  // if (session && session.user) {
  //   return (
  //     <div className="flex gap-4 ml-auto">
  //       <p className="text-sky-600">
  //         {session.user
  //           ? `Logged in as ${session.user.email}`
  //           : "Not logged in"}
  //       </p>

  //       <form action="/auth/signout" method="post">
  //         <button className="button block" type="submit">
  //           Sign out
  //         </button>
  //       </form>
  //     </div>
  //   );
  // }
  return (
    <>
      <div>
        {pathname !== "/sign-in" && (
          <Link href={"/sign-in"}>
            <Button type="submit">Sign In</Button>
          </Link>
        )}
      </div>
      {/* <div>
        {pathname === "/sign-in" && (
          <Link href={"/sign-up"}>
            <Button type="submit">Sign Up</Button>
          </Link>
        )}
      </div> */}
    </>
  );
}

export default SigninButton;
