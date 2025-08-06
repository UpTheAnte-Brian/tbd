"use server";

import { Menu } from "./definitions";

async function Menus() {
  const res: Menu[] = [
    {
      name: "Features",
      subMenuHeading: ["Admin", "Scale"],
      subMenu: [
        {
          name: "District Management",
          desc: "Manage data and logos",
          icon: "panels-top-left",
          path: "/admin/districts",
          method: "GET",
        },
        {
          name: "Management",
          desc: "Site control",
          icon: "bolt",
          path: "/dashboard",
          method: "GET",
        },
        {
          name: "Navigation",
          desc: "Link pages",
          icon: "panel-top",
          path: "/dashboard",
          method: "GET",
        },
        {
          name: "CMS",
          desc: "Management content",
          icon: "database",
          path: "/dashboard",
          method: "GET",
        },
      ],
      gridCols: 2,
      path: "/dashboard",
    },
    {
      name: "Resources",
      subMenuHeading: ["Get started", "Programs", "Recent"],
      subMenu: [
        {
          name: "Markplace",
          desc: "Browse templates",
          icon: "shopping-bag",
          path: "/dashboard",
          method: "GET",
        },
        {
          name: "Meetups",
          desc: "Upcoming events",
          icon: "map-pin",
          path: "/dashboard",
          method: "GET",
        },
        {
          name: "Updates",
          desc: "Changelog",
          icon: "bell-dot",
          path: "/dashboard",
          method: "GET",
        },
        {
          name: "Academy",
          desc: "Watch lessions",
          icon: "play",
          path: "/dashboard",
          method: "GET",
        },
        {
          name: "Blog",
          desc: "Posts",
          icon: "book-open-text",
          path: "/dashboard",
          method: "GET",
        },
        {
          name: "Figma",
          desc: "Plugin",
          icon: "figma",
          path: "/dashboard",
          method: "GET",
        },
        {
          name: "Experts",
          desc: "Jobs",
          icon: "briefcase-business",
          path: "/dashboard",
          method: "GET",
        },
        {
          name: "Gallery",
          desc: "Images",
          icon: "images",
          path: "/dashboard",
          method: "GET",
        },
      ],
      gridCols: 3,
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
          method: "POST",
        },
        {
          name: "Dashboard",
          desc: "let's make progress",
          icon: "users",
          path: "/dashboard",
          method: "GET",
        },
      ],
      gridCols: 1,
      path: "/dashboard",
    },
    {
      name: "Contact",
      path: "/dashboard",
    },
  ];

  return res;
}

export default Menus;
