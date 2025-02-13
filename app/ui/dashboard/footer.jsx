import Link from "next/link";

const Footer = () => {
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

export default Footer;
