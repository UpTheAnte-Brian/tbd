"use server";

import { Menu } from "./types/types";

async function Menus() {
  const res: Menu[] = [
    {
      name: "Learn",
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
      name: "Explore",
      authRequired: false,
      subMenu: [
        {
          name: "Districts",
          desc: "School District List",
          icon: "user-pen",
          path: "/districts",
          method: "GET",
        },
        {
          name: "Businesses",
          desc: "Participating Businesses",
          icon: "users",
          path: "/businesses",
          method: "GET",
        },
        {
          name: "Non-Profits",
          desc: "Foundations and other Local Charities",
          icon: "users",
          path: "/nonprofits",
          method: "GET",
        },
        {
          name: "Superintendent",
          desc: "District transparency review",
          icon: "users",
          path: "/districts/7c46ab8d-84d9-5f5e-b1e6-2cf2c8027e4e?tab=superintendent",
          method: "GET",
          authRequired: true,
        },
        {
          name: "Admin",
          desc: "Admin console",
          icon: "users",
          path: "/admin",
          method: "GET",
          authRequired: true,
        },
      ],
      gridCols: 1,
      path: "/info",
    },
    {
      name: "Donate",
      authRequired: false,
      subMenu: [
        {
          name: "Donate",
          desc: "View your profile",
          icon: "user-pen",
          path: "/donate",
          method: "GET",
          authRequired: false,
        },
        {
          name: "Receipts",
          desc: "Receipts",
          icon: "users",
          path: "/receipts",
          method: "GET",
          authRequired: true,
        },
      ],
      gridCols: 1,
      path: "/donate",
    },
    // {
    //   name: "Account",
    //   authRequired: true,
    //   subMenu: [
    //     {
    //       name: "Profile",
    //       desc: "View your profile",
    //       icon: "user-pen",
    //       path: "/account",
    //       method: "GET",
    //       authRequired: true,
    //     },
    //     {
    //       name: "Users",
    //       desc: "TBD",
    //       icon: "users",
    //       path: "/users",
    //       method: "GET",
    //       authRequired: true,
    //     },
    //     {
    //       name: "Logout",
    //       desc: "sign out",
    //       icon: "users",
    //       path: "/auth/signout",
    //       method: "POST",
    //       authRequired: true,
    //     },
    //   ],
    //   gridCols: 1,
    //   path: "/account",
    // },
  ];

  return res;
}

export default Menus;
