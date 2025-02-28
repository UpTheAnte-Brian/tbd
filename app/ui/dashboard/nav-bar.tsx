// "use client";
import Link from "next/link";
import AcmeLogo from "../acme-logo";
// import { useState } from "react";
// import SideNav from "./sidenav";

const NavBar = () => {
  // const [isHovering, setIsHovering] = useState(false);
  return (
    <nav className="flex justify-between flex-wrap text-slate-100 bg-blue-600 p-1">
      <div className="flex flex-row items-center leading-none text-slate-100">
        <Link
          href="/dashboard"
          className="p-2"
          // onMouseEnter={() => setIsHovering(true)}
          // onMouseLeave={() => setIsHovering(false)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-8 ml-5"
          >
            <path
              fillRule="evenodd"
              d="M3 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 5.25Zm0 4.5A.75.75 0 0 1 3.75 9h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 9.75Zm0 4.5a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Zm0 4.5a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z"
              clipRule="evenodd"
            />
          </svg>
          {/* {isHovering && (
            <div className="absolute">
              <SideNav />
            </div>
          )} */}
        </Link>
      </div>
      <div className="flex">
        <Link
          className="flex  items-end justify-start rounded-md bg-blue-500"
          href="/"
        >
          <AcmeLogo />
        </Link>
      </div>
      <div className="flex items-center p-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-8 mr-5"
        >
          <path
            fillRule="evenodd"
            d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </nav>
  );
};

export default NavBar;
