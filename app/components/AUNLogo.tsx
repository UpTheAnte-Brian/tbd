import Link from "next/link";
import Image from "next/image";
import Logo from "../../public/logo.webp";

// This goes on the main layout page, left side of nav bar.
export default function AUNLogo({
  backgroundWhite = false,
}: {
  backgroundWhite?: boolean;
}) {
  return (
    <>
      <Link className="flex-center-center gap-x-1 relative" href={"/"}>
        <Image src={Logo} alt="Logo" className="size-4 md:size-8" />
        <h3
          className={`${
            backgroundWhite ? "text-black" : "text-white"
          } text-sm font-semibold md:text-md lg:text-lg`}
        >
          Ante Up Nation
        </h3>
      </Link>
    </>
  );
}
