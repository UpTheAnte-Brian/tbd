"use server";

import "@/app/ui/style.css";
import { inter } from "./ui/fonts";
import Footer from "./ui/dashboard/footer";
import { StyledEngineProvider } from "@mui/material";
import Menus from "./lib/menus";
import { Menu } from "./lib/definitions";
import DesktopMenu from "./components/DesktopMenu";
import MobMenu from "./components/MobMenu";
import AUNLogo from "./components/AUNLogo";
import Providers from "./components/providers";
import SignInButton from "./components/SignInButton";

// This sets the title on your browser tab.
// export const metadata = {
//   title: "Home",
//   // description: "Ante Up Nation",
//   description: "React Skills developkment",
// };

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // console.log("Menus", Menus);
  const testMenus = await Menus();
  // console.log("testMenus", testMenus);
  return (
    <html lang="en">
      <head>
        {/* <script
          src="https://apis.google.com/js/platform.js"
          async
          defer
        ></script> */}
        {/* <meta
          name="google-signin-client_id"
          content={process.env.AUTH_GOOGLE_ID}
        ></meta> */}
      </head>
      <body
        className={`${inter.className} antialiased flex flex-col min-h-100vh p-1`}
      >
        <StyledEngineProvider injectFirst>
          <Providers>
            <main className="relative">
              <header className="h-16 text-[15px] fixed inset-0 flex-center bg-[#18181A] z-[999]">
                <nav className=" px-3.5 flex-center-between w-full max-w-7xl mx-auto">
                  <AUNLogo />

                  <ul className="gap-x-1 lg:flex-center hidden">
                    {testMenus.map((menu: Menu) => (
                      <DesktopMenu
                        menu={JSON.stringify(menu)}
                        key={menu.name}
                      />
                    ))}
                  </ul>
                  <div className="flex-center gap-x-5">
                    <SignInButton />
                    <div className="lg:hidden">
                      <MobMenu Menus={testMenus} />
                    </div>
                  </div>
                </nav>
              </header>
              <div className="min-h-75svh mt-16">{children}</div>
              <div className="outline rounded-lg inset-0 min-h-10svh">
                <Footer />
              </div>
            </main>
          </Providers>
        </StyledEngineProvider>
      </body>
    </html>
  );
}
