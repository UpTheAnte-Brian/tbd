"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Menu } from "../lib/definitions";
import DynamicIcon from "./DynamicIcon";

import dynamicIconImports from "lucide-react/dynamicIconImports";
import Link from "next/link";
type IconName = keyof typeof dynamicIconImports;

{
  /* <instructions>
- In `app/components/DesktopMenu.tsx`, refactor the submenu rendering so that `subMenuHeading` values are treated as column headers, and the `subMenu` items are grouped evenly under each heading based on `gridCols`.
- Before rendering, create a `columns` array by splitting `menuObj.subMenu` into chunks based on the number of headings (`menuObj.subMenuHeading.length`) and `menuObj.gridCols`.
- Remove the existing direct `map` over `menuObj.subMenu` and instead `map` over `columns`, rendering the heading once at the top of each column, followed by that column's items.
- Keep the same `Link` and icon rendering logic for items.
- Preserve all existing animations, container `motion.div`, and CSS classes.
</instructions> */
}

export default function DesktopMenu({ menu }: { menu: string }) {
  const [isHover, toggleHover] = useState(false);
  const toggleHoverMenu = () => {
    toggleHover(!isHover);
  };

  const subMenuAnimate = {
    enter: {
      opacity: 1,
      rotateX: 0,
      transition: {
        duration: 0.5,
      },
      display: "block",
    },
    exit: {
      opacity: 0,
      rotateX: -15,
      transition: {
        duration: 0.5,
      },
      transitionEnd: {
        display: "none",
      },
    },
  };
  const menuObj: Menu = JSON.parse(menu);
  // console.log("menuObj", menuObj);
  const hasSubMenu = menuObj?.subMenu?.length;
  let columns: { heading: string; items: typeof menuObj.subMenu }[] = [];
  if (menuObj?.subMenuHeading?.length) {
    const numCols = menuObj.subMenuHeading.length;
    const itemsPerCol = Math.ceil((menuObj.subMenu?.length || 0) / numCols);
    columns = menuObj.subMenuHeading.map((heading, colIndex) => {
      const start = colIndex * itemsPerCol;
      const end = start + itemsPerCol;
      return {
        heading,
        items: menuObj.subMenu?.slice(start, end) || [],
      };
    });
  } else {
    columns = [{ heading: "", items: menuObj.subMenu || [] }];
  }

  return (
    <motion.li
      className="group/link"
      onHoverStart={() => {
        toggleHoverMenu();
      }}
      onHoverEnd={toggleHoverMenu}
      key={menuObj.name}
    >
      <span className="flex-center gap-1 hover:bg-white/5 cursor-pointer px-3 py-1 rounded-xl">
        {hasSubMenu ? (
          <>
            {menuObj.name}{" "}
            <DynamicIcon
              name="chevron-down"
              className="mt-[0.6px] group-hover/link:rotate-180 duration-200"
            />
          </>
        ) : (
          <Link href={menuObj.path} className="flex items-center">
            {menuObj.name}
          </Link>
        )}
      </span>
      {hasSubMenu && (
        <motion.div
          className="sub-menu"
          initial="exit"
          animate={isHover ? "enter" : "exit"}
          variants={subMenuAnimate}
        >
          <div
            className={`grid gap-7 ${
              menuObj.gridCols === 3
                ? "grid-cols-3"
                : menuObj.gridCols === 2
                ? "grid-cols-2"
                : "grid-cols-1"
            }`}
          >
            {hasSubMenu &&
              columns.map((col, colIndex) => (
                <div key={colIndex} className="flex flex-col gap-y-4">
                  {col.heading && (
                    <p className="text-sm text-gray-500 h-5">{col.heading}</p>
                  )}
                  {(col.items ?? []).map((submenu, i) => (
                    <div className="relative cursor-pointer" key={i}>
                      <Link
                        href={submenu.path}
                        className="flex items-center gap-x-4 group/menubox"
                      >
                        <div className="bg-white/5 w-fit p-2 rounded-md group-hover/menubox:bg-white group-hover/menubox:text-gray-900 duration-300">
                          {submenu.icon && (
                            <DynamicIcon name={submenu.icon as IconName} />
                          )}
                        </div>
                        <div>
                          <h6 className="font-semibold">{submenu.name}</h6>
                          <p className="text-sm text-gray-400">
                            {submenu.desc}
                          </p>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </motion.div>
      )}
    </motion.li>
  );
}
