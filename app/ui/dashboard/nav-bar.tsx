import Link from "next/link";

const NavBar = () => {
  return (
    <nav className="flex justify-between flex-wrap p-3">
      <ul className="flex">
        <li>
          <Link href="/dashboard" className="p-3">
            Dashboard
          </Link>
        </li>
        <li>
          <Link href="/" className="ml-3">
            Home
          </Link>
        </li>
      </ul>
      <ul className="flex">
        <li>
          <Link href="/map" className="p-3">
            Map
          </Link>
        </li>
        <li>
          <Link href="/tailwind" className="ml-3">
            Tailwind
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default NavBar;
