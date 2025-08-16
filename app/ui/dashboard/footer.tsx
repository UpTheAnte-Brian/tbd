import Link from "next/link";

const Footer = () => {
  return (
    <nav className="flex justify-between flex-wrap p-3">
      <ul className="flex">
        <li>
          <Link href="/dashboard" className="p-3" prefetch={false}>
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
          <Link href="/dashboard/map" className="p-3" prefetch={false}>
            Map
          </Link>
        </li>
        <li>
          <Link href="/tailwind" className="ml-3" prefetch={false}>
            TailwindCSS
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Footer;
