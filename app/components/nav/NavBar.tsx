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
      // Keep menu if not authRequired or user has role
      return (
        !menu.authRequired ||
        (isLoggedIn && (!menu.roles || menu.roles.includes(user?.role || "")))
      );
    })
    .map((menu: Menu) => {
      // Replace "Account" menu label with username if available
      if (menu.name === "Account" && user?.username) {
        return { ...menu, name: user.username };
      }
      return menu;
    });

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
            {filteredMenus.map((menu: Menu) => (
              <DesktopMenu
                menu={JSON.stringify(menu)}
                user={user}
                key={menu.name}
              />
            ))}
          </ul>
        </div>

        {/* Right: Sign out + Mobile Toggle */}
        <div className="flex-shrink-0 flex items-center gap-x-3 ml-auto">
          <div className="flex items-center gap-x-3 ml-auto">
            {/* {user && (
              <p className="text-sky-600 md:flex items-center hidden">
                {user.username
                  ? `${user.username} (${user.role})`
                  : "No User Name"}
              </p>
            )}
            {user && (
              <form action="/auth/signout" method="post">
                <Button type="submit">Sign Out</Button>
              </form>
            )} */}
            {!user && <SignInButton />}
            <div className="lg:hidden">
              <MobMenu Menus={filteredMenus} />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
