import Link from "next/link";
import Image from "next/image";
import Logo from "../../public/logo.webp";

export default function AUNLogo() {
  return (
    <>
      <Link className="flex-center gap-x-3 z-[999] relative" href={"/"}>
        <Image src={Logo} alt="Logo" className="size-8" />
        <h3 className="text-lg font-semibold">Ante Up Nation</h3>
      </Link>
    </>
  );
}
