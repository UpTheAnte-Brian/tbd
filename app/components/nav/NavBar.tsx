"use server";

import { createClient } from "../../../utils/supabase/server";

import AUNLogo from "@/app/components/AUNLogo";
import Menus from "@/app/lib/menus";
import DesktopMenu from "@/app/components/DesktopMenu";
import { Menu } from "@/app/lib/definitions";
import SignInButton from "@/app/components/SignInButton";
import MobMenu from "@/app/components/MobMenu";
import { Button } from "@/app/ui/button";

export default async function NavBarComponent() {
  const testMenus = await Menus();
  const supabase = await createClient();
  const { data: session } = await supabase.auth.getUser();
  return (
    <nav className="w-full bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
        {/* Left: Logo */}
        <div className="flex-shrink-0">
          <AUNLogo />
        </div>

        {/* Center: Desktop Menu */}
        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2">
          <ul className="flex gap-x-6">
            {testMenus.map((menu: Menu) => (
              <DesktopMenu menu={JSON.stringify(menu)} key={menu.name} />
            ))}
          </ul>
        </div>

        {/* Right: Sign out + Mobile Toggle */}
        <div className="flex-shrink-0 flex items-center gap-x-3 ml-auto">
          <div className="flex items-center gap-x-3 ml-auto">
            {session.user && (
              <p className="text-sky-600 md:flex items-center hidden">
                {session.user && session.user.email
                  ? `${session.user.email.split("@")[0]}`
                  : "Not logged in"}
              </p>
            )}
            {session.user && (
              <form action="/auth/signout" method="post">
                <Button type="submit">Sign Out</Button>
              </form>
            )}
            {!session.user && <SignInButton />}
            <div className="lg:hidden">
              <MobMenu Menus={testMenus} />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
