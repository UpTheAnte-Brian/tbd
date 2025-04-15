// "use server";

// import { Bolt } from "lucide-react";
// import { ShoppingBag } from "lucide-react";
// import { BellDot } from "lucide-react";
// import { BookOpenText } from "lucide-react";
// import { BriefcaseBusiness } from "lucide-react";
// import { CircleHelp } from "lucide-react";
// import { TriangleAlert } from "lucide-react";
// import { Users } from "lucide-react";
// import { Lock } from "lucide-react";
// import { Dessert } from "lucide-react";
// import { ShieldPlus } from "lucide-react";
// import { MessageCircle } from "lucide-react";
// import { Images } from "lucide-react";
// import { Figma } from "lucide-react";
// import { Play } from "lucide-react";
// import { MapPin } from "lucide-react";
// import { Database } from "lucide-react";
// import { PanelsTopLeft } from "lucide-react";
// import { PanelTop } from "lucide-react";
import { Menu } from "./definitions";

async function Menus() {
  const res: Menu[] = [
    {
      name: "Features",
      subMenuHeading: ["Design", "Scale"],
      subMenu: [
        {
          name: "Design",
          desc: "Responsive design",
          icon: "panels-top-left",
          path: "/dashboard",
        },
        {
          name: "Management",
          desc: "Site control",
          icon: "bolt",
          path: "/dashboard",
        },
        {
          name: "Navigation",
          desc: "Link pages",
          icon: "panel-top",
          path: "/dashboard",
        },
        {
          name: "CMS",
          desc: "Management content",
          icon: "database",
          path: "/dashboard",
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
        },
        {
          name: "Meetups",
          desc: "Upcoming events",
          icon: "map-pin",
          path: "/dashboard",
        },
        {
          name: "Updates",
          desc: "Changelog",
          icon: "bell-dot",
          path: "/dashboard",
        },
        {
          name: "Academy",
          desc: "Watch lessions",
          icon: "play",
          path: "/dashboard",
        },
        {
          name: "Blog",
          desc: "Posts",
          icon: "book-open-text",
          path: "/dashboard",
        },
        {
          name: "Figma",
          desc: "Plugin",
          icon: "figma",
          path: "/dashboard",
        },
        {
          name: "Experts",
          desc: "Jobs",
          icon: "briefcase-business",
          path: "/dashboard",
        },
        {
          name: "Gallery",
          desc: "Images",
          icon: "images",
          path: "/dashboard",
        },
      ],
      gridCols: 3,
      path: "/dashboard",
    },
    {
      name: "Support",
      subMenu: [
        {
          name: "Help",
          desc: "Center",
          icon: "circle-help",
          path: "/dashboard",
        },
        {
          name: "Community",
          desc: "Project help",
          icon: "message-circle",
          path: "/dashboard",
        },
        {
          name: "Emergency",
          desc: "Urgent issues",
          icon: "triangle-alert",
          path: "/dashboard",
        },
      ],
      gridCols: 1,
      path: "/dashboard",
    },
    {
      name: "Enterprise",
      subMenuHeading: ["Overview", "Features"],
      subMenu: [
        {
          name: "Enterprise",
          desc: "Overview",
          icon: "shield-plus",
          path: "/dashboard",
        },
        {
          name: "Collaboration",
          desc: "Design together",
          icon: "users",
          path: "/dashboard",
        },
        {
          name: "Customers",
          desc: "Stories",
          icon: "dessert",
          path: "/dashboard",
        },
        {
          name: "Security",
          desc: "Your site secured",
          icon: "lock",
          path: "/dashboard",
        },
      ],
      gridCols: 2,
      path: "/dashboard",
    },
    {
      name: "Pricing",
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
