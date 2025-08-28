"use server";

import { Menu } from "./types";

async function Menus() {
  const res: Menu[] = [
    {
      name: "Features",
      subMenuHeading: ["Admin"],
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
        // {
        //   name: "Management",
        //   desc: "Site control",
        //   icon: "bolt",
        //   path: "/dashboard",
        //   method: "GET",
        // },
        // {
        //   name: "Navigation",
        //   desc: "Link pages",
        //   icon: "panel-top",
        //   path: "/dashboard",
        //   method: "GET",
        // },
        // {
        //   name: "CMS",
        //   desc: "Management content",
        //   icon: "database",
        //   path: "/dashboard",
        //   method: "GET",
        // },
      ],
      gridCols: 1,
      path: "/dashboard",
    },
    {
      name: "Account",
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
          name: "Dashboard",
          desc: "let's make progress",
          icon: "users",
          path: "/dashboard",
          method: "GET",
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
      path: "/dashboard",
    },
    {
      name: "Contact",
      path: "/contact",
    },
  ];

  return res;
}

export default Menus;
