import Link from "next/link";
import Image from "next/image";
import Logo from "../../public/logo.webp";

// This goes on the main layout page, left side of nav bar.
export default function AUNLogo() {
  return (
    <>
      <Link className="flex justify-center gap-x-1 z-[999] relative" href={"/"}>
        <Image src={Logo} alt="Logo" className="size-8" />
        <h3 className="text-lg font-semibold">Ante Up Nation</h3>
      </Link>
    </>
  );
}
