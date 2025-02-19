import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import Image from "next/image";
import SignIn from "./ui/sign-in";

export default function Page() {
  return (
    <>
      <div className="flex grow flex-col gap-4 md:flex-row rounded-lg outline">
        <div className="flex flex-col justify-center gap-6 px-6 py-10 md:w-2/5 md:px-20 rounded-lg outline">
          <p className={`text-xl text-gray-800 md:text-3xl md:leading-normal`}>
            <strong>Site in Development</strong> <br />
            This is a prototype for{" "}
            <a href="https://uptheante.org/" className="text-blue-500">
              UpTheAnte.org
            </a>
            , brought to you by Ante Up Nation.
          </p>
          <Link
            href="/login"
            className="flex items-center gap-5 self-start rounded-lg bg-blue-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-400 md:text-base"
          >
            <span>Log in</span> <ArrowRightIcon className="w-5 md:w-6" />
          </Link>
          <SignIn />
        </div>
        <div className="flex items-center justify-center p-6 md:w-3/5 md:px-28 md:py-12 rounded-lg outline">
          <Image
            src="/hero-desktop.png"
            width={1000}
            height={760}
            className="hidden md:block"
            alt="Screenshots of the dashboard project showing desktop version"
          />
          <Image
            src="/hero-mobile.png"
            width={560}
            height={620}
            className="block md:hidden"
            alt="Screenshots of the dashboard project showing mobile version"
          />
        </div>
      </div>
    </>
  );
}
