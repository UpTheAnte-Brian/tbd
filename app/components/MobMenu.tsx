"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Menu as MenuObj } from "../lib/definitions";
import dynamicIconImports from "lucide-react/dynamicIconImports";
type IconName = keyof typeof dynamicIconImports;
import DynamicIcon from "./DynamicIcon";
import Link from "next/link";

export default function MobMenu({ Menus }: { Menus: MenuObj[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [clicked, setClicked] = useState<number | null>(null);
  const toggleDrawer = () => {
    setIsOpen(!isOpen);
    setClicked(null);
  };

  const subMenuDrawer = {
    enter: { height: "auto", overflow: "hidden" },
    exit: { height: 0, overflow: "hidden" },
  };

  return (
    <div className="flex items-center">
      <button className="lg:hidden z-[999] relative" onClick={toggleDrawer}>
        {isOpen ? <DynamicIcon name="x" /> : <DynamicIcon name="menu" />}
      </button>

      <motion.div
        className="fixed left-0 right-0 top-16 overflow-y-auto h-full bg-[#18181A] backdrop-blur text-white p-6 pb-20"
        initial={{ x: "-100%" }}
        animate={{ x: isOpen ? "0%" : "-100%" }}
      >
        <ul>
          {Menus.map(({ name, subMenu }, i) => {
            const isClicked = clicked === i;
            const hasSubMenu = subMenu?.length;
            return (
              <li key={name}>
                <span
                  className="flex-center-between p-4 hover:bg-white/5 rounded-md cursor-pointer relative"
                  onClick={() => setClicked(isClicked ? null : i)}
                >
                  {name}
                  {hasSubMenu && (
                    <DynamicIcon
                      name="chevron-down"
                      className={`ml-auto transition-transform ${
                        isClicked && "rotate-180"
                      }`}
                    />
                  )}
                </span>
                {hasSubMenu && (
                  <motion.ul
                    initial="exit"
                    animate={isClicked ? "enter" : "exit"}
                    variants={subMenuDrawer}
                    className="pl-4 space-y-1" // small indent + spacing
                  >
                    {subMenu.map(({ name, icon, path }) => (
                      <li
                        key={name}
                        className="p-2 flex items-center hover:bg-white/5 rounded-md gap-x-2 cursor-pointer"
                      >
                        <Link href={path} className="flex items-center w-full">
                          <span className="w-6 flex justify-center items-center flex-shrink-0">
                            <DynamicIcon
                              name={icon as IconName}
                              className="size-17"
                            />
                          </span>

                          {name}
                        </Link>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </li>
            );
          })}
        </ul>
      </motion.div>
    </div>
  );
}

{
  /* <instructions>
- In `app/components/MobMenu.tsx`, locate the `subMenu.map` rendering inside the `<motion.ul>` block.
- Currently, the `<Link>` contains a `<span>` for the icon and then `{name}`, but the `<Link>` is not set up as a flex container, so the icon and text may not align horizontally.
- Update the `<Link>` to include `className="flex items-center gap-x-2 w-full"`, ensuring horizontal alignment and spacing between icon and text.
- Remove the `gap-x-2` class from the `<li>` and let the `<Link>` handle it.
- Ensure the `<li>` remains a block element with hover styles.
</instructions> */
}
