import Link from "next/link";
import Image from "next/image";

// This goes on the main layout page, left side of nav bar.
export default function AUNLogo({
  backgroundWhite = false,
}: {
  backgroundWhite?: boolean;
}) {
  return (
    <>
      <Link className="relative flex items-center gap-2.5" href="/">
        <Image
          src="/community-pockets-mark.svg"
          alt="Community Pockets logo"
          width={40}
          height={40}
          className="h-8 w-8 shrink-0 md:h-10 md:w-10"
        />
        <div className="min-w-0 leading-none">
          <div
            className={`${
              backgroundWhite ? "text-brand-secondary-1" : "text-brand-primary-1"
            } text-sm font-semibold tracking-[0.12em] uppercase sm:text-base`}
          >
            Community
          </div>
          <div
            className={`${
              backgroundWhite ? "text-brand-secondary-1" : "text-brand-primary-1"
            } text-lg font-semibold sm:text-xl`}
          >
            Pockets
          </div>
        </div>
      </Link>
    </>
  );
}
