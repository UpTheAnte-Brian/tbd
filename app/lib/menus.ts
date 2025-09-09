"use server";

import { Menu } from "./types";

async function Menus() {
  const res: Menu[] = [
    {
      name: "Admin",
      authRequired: true,
      roles: ["admin"],
      subMenu: [
        {
          name: "District Management",
          desc: "Manage data and logos",
          icon: "panels-top-left",
          path: "/admin/districts",
          method: "GET",
          authRequired: true,
          roles: ["admin"],
        },
        {
          name: "Users",
          desc: "TBD",
          icon: "users",
          path: "/users",
          method: "GET",
          authRequired: true,
          roles: ["admin"],
        },
      ],
      gridCols: 1,
      path: "/admin",
    },
    {
      name: "Account",
      authRequired: true,
      subMenu: [
        {
          name: "Profile",
          desc: "View your profile",
          icon: "user-pen",
          path: "/account",
          method: "GET",
          authRequired: true,
        },
        {
          name: "Users",
          desc: "TBD",
          icon: "users",
          path: "/users",
          method: "GET",
          authRequired: true,
          roles: ["admin"],
        },
      ],
      gridCols: 1,
      path: "/account",
    },
    {
      name: "Our Story",
      authRequired: false,
      subMenu: [
        {
          name: "Fundamentals",
          desc: "Fundamentals",
          icon: "user-pen",
          path: "/info/fundamentals",
          method: "GET",
        },
        {
          name: "Up The Ante",
          desc: "TBD",
          icon: "users",
          path: "/info/uptheante",
          method: "GET",
        },
        {
          name: "Capitalist Roots",
          desc: "TBD",
          icon: "users",
          path: "/info/growth",
          method: "GET",
        },
      ],
      gridCols: 1,
      path: "/info",
    },
    {
      name: "Contact",
      path: "/contact",
    },
  ];

  return res;
}

export default Menus;
