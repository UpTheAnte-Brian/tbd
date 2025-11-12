"use client";

import React, { useEffect, useState } from "react";
import AUNLogo from "@/app/components/AUNLogo";
import Menus from "@/app/lib/menus";
import DesktopMenu from "@/app/components/DesktopMenu";
import { Menu } from "@/app/lib/types";
import SignInButton from "@/app/components/SignInButton";
import MobMenu from "@/app/components/MobMenu";
import { useUser } from "@/app/hooks/useUser";

export default function NavBarComponent() {
  const [menus, setMenus] = useState<Menu[]>([]);

  useEffect(() => {
    async function fetchMenus() {
      const result = await Menus();
      setMenus(result);
    }
    fetchMenus();
  }, []);

  const { user } = useUser();
  const isLoggedIn = !!user;

  const filteredMenus = menus
    .filter((menu: Menu) => {
      return (
        !menu.authRequired ||
        (isLoggedIn &&
          (!menu.roles || menu.roles.includes(user?.global_role || "")))
      );
    })
    .map((menu: Menu) => {
      if (menu.name === "Account" && user?.username) {
        return { ...menu, name: user.username };
      }
      return menu;
    });

  return (
    <nav className="w-full bg-gray-900 text-white">
      {/* center container with fixed max width */}
      <div
        className="max-w-7xl mx-0 px-4 h-16
                      grid items-center
                      grid-cols-[auto_1fr_auto]"
      >
        {/* Left: Logo */}
        <div className="flex items-center justify-start">
          <AUNLogo />
        </div>

        {/* Center: Desktop Menu (truly centered between left & right) */}
        <div className="hidden lg:flex justify-center">
          <ul className="flex gap-x-6">
            {filteredMenus.map((menu: Menu) => (
              <DesktopMenu
                menu={JSON.stringify(menu)}
                user={user}
                key={menu.name}
              />
            ))}
          </ul>
        </div>

        {/* Right: Sign In / Mobile Menu */}
        <div className="flex items-center justify-end gap-x-3">
          {!user && <SignInButton />}
          <div className="lg:hidden">
            <MobMenu Menus={filteredMenus} />
          </div>
        </div>
      </div>
    </nav>
  );
}
