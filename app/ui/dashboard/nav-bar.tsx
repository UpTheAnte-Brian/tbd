import Link from "next/link";
import AcmeLogo from "../acme-logo";

const NavBar1 = () => {
  return (
    <nav className="flex justify-between flex-wrap text-slate-100 bg-blue-600 p-1">
      <ul className="flex flex-row items-center leading-none text-slate-100">
        <li>
          <Link href="/dashboard" className="p-3">
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
          </Link>
        </li>
      </ul>
      <ul className="flex">
        <li>
          <Link
            className="flex  items-end justify-start rounded-md bg-blue-500"
            href="/"
          >
            <AcmeLogo />
          </Link>
        </li>
      </ul>
      <ul className="flex">
        <li>
          <Link href="/dashboard/map" className="p-3">
            Map
          </Link>
        </li>
        <li>
          <Link href="/tailwind" className="ml-3">
            TailwindCSS
          </Link>
        </li>
      </ul>
    </nav>
  );
};

const NavBar = () => {
  return (
    <nav className="flex justify-between flex-wrap text-slate-100 bg-blue-600 p-1">
      <div className="flex flex-row items-center leading-none text-slate-100">
        <Link href="/dashboard" className="p-2">
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
