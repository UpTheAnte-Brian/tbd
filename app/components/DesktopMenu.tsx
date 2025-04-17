"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Menu } from "../lib/definitions";
import DynamicIcon from "./DynamicIcon";

import dynamicIconImports from "lucide-react/dynamicIconImports";
import Link from "next/link";
type IconName = keyof typeof dynamicIconImports;

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
        {menuObj.name}
        {hasSubMenu && (
          <DynamicIcon
            name="chevron-down"
            className="mt-[0.6px] group-hover/link:rotate-180 duration-200"
          />
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
              menuObj.subMenu?.map((submenu, i) => (
                <div className="relative cursor-pointer" key={i}>
                  {menuObj.gridCols &&
                    menuObj.gridCols > 1 &&
                    menuObj?.subMenuHeading?.[i] && (
                      <p className="text-sm mb-4 text-gray-500">
                        {menuObj?.subMenuHeading?.[i]}
                      </p>
                    )}
                  <Link
                    href="/dashboard"
                    className="flex-center gap-x-4 group/menubox"
                  >
                    <div className="bg-white/5 w-fit p-2 rounded-md group-hover/menubox:bg-white group-hover/menubox:text-gray-900 duration-300">
                      {submenu.icon && (
                        <DynamicIcon name={submenu.icon as IconName} />
                      )}
                    </div>
                    <div>
                      <h6 className="font-semibold">{submenu.name}</h6>
                      <p className="text-sm text-gray-400">{submenu.desc}</p>
                    </div>
                  </Link>
                </div>
              ))}
          </div>
        </motion.div>
      )}
    </motion.li>
  );
}
