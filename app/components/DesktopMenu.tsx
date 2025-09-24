"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, Profile } from "../lib/types";
import DynamicIcon from "./DynamicIcon";
import { buildColumns } from "../lib/menuUtils";

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

export default function DesktopMenu({
  menu,
  user,
}: {
  menu: string;
  user: Profile | null;
}) {
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
  const hasSubMenu = menuObj?.subMenu?.length && menuObj?.subMenu?.length > 0;
  const columns = buildColumns(menuObj, user);

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
          className="sub-menu w-max px-6"
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
                      {/* <instructions>
- In `app/components/DesktopMenu.tsx`, find the block where `String(submenu.method ?? "").toUpperCase() === "POST"` is handled.
- Inside that block, replace the `<form>` and `<button>` structure with a `<form>` wrapping a `<Link>`-style flex container, so styling matches the non-POST case.
- Specifically:
  - Remove the `button` element entirely.
  - Apply the same classes from the `<Link>` in the non-POST case (`flex items-center gap-x-4 group/menubox`).
  - Preserve the `form` tag with `action={submenu.path}` and `method="post"`.
  - Inside the `form`, add a `button` but make it `className="flex items-center gap-x-4 group/menubox w-full text-left"` and wrap the same icon/text markup so it visually aligns with the non-POST links.
</instructions> */}

                      {String(submenu.method ?? "").toUpperCase() === "POST" ? (
                        <form
                          action={submenu.path}
                          method="post"
                          className="m-0 p-0"
                        >
                          <button
                            type="submit"
                            className="flex items-center gap-x-4 group/menubox bg-transparent border-none p-0 font-inherit text-inherit cursor-pointer appearance-none"
                          >
                            <div className="bg-white/5 w-fit p-2 rounded-md group-hover/menubox:bg-white group-hover/menubox:text-gray-900 duration-300">
                              {submenu.icon && (
                                <DynamicIcon
                                  name={submenu.icon as IconName}
                                  className="stroke-gray-300 group-hover/menubox:stroke-gray-900"
                                />
                              )}
                            </div>
                            <div>
                              <h6 className="font-semibold">{submenu.name}</h6>
                              <p className="text-sm text-gray-400">
                                {submenu.desc}
                              </p>
                            </div>
                          </button>
                        </form>
                      ) : (
                        <Link
                          href={submenu.path}
                          className="flex items-center gap-x-4 group/menubox"
                        >
                          <div className="bg-white/5 w-fit p-2 rounded-md group-hover/menubox:bg-white group-hover/menubox:text-gray-900 duration-300">
                            {submenu.icon && (
                              <DynamicIcon
                                name={submenu.icon as IconName}
                                className="stroke-gray-300 group-hover/menubox:stroke-gray-900"
                              />
                            )}
                          </div>
                          <div>
                            <h6 className="font-semibold">{submenu.name}</h6>
                            <p className="text-sm text-gray-400">
                              {submenu.desc}
                            </p>
                          </div>
                        </Link>
                      )}
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
