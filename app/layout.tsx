"use server";

import "@/app/ui/style.css";
import { inter } from "./ui/fonts";
// import Footer from "./ui/dashboard/footer";
import { StyledEngineProvider } from "@mui/material";
// import Menus from "./lib/menus";
// import { Menu } from "./lib/definitions";
// import DesktopMenu from "./components/DesktopMenu";
// import MobMenu from "./components/MobMenu";
// import AUNLogo from "./components/AUNLogo";
// import SignInButton from "./components/SignInButton";
// import { createClient } from "../utils/supabase/server";
// import { Button } from "./ui/button";
import NavBarComponent from "@/app/components/nav/NavBar";

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
  // const testMenus = await Menus();
  // const supabase = await createClient();
  // const { data: session } = await supabase.auth.getUser();
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
        className={`${inter.className} antialiased flex flex-col min-h-screen overflow-x-hidden`}
      >
        <script
          src="https://accounts.google.com/gsi/client"
          async
          defer
        ></script>
        .
        <StyledEngineProvider injectFirst>
          <main className="relative">
            {/* Header: Fixed position, ensure content flows below it */}
            <header className="h-16 text-[15px] fixed top-0 w-full bg-[#18181A] z-[999]">
              <NavBarComponent></NavBarComponent>
            </header>

            {/* Main Content Area: Use padding-top to create space below the fixed header */}
            <div className="pt-10 min-h-[100dvh]">
              {/* Added pt- to account for header height */}
              {children}
            </div>

            {/* Footer */}
            {/* <div className="min-h-10vh bg-[#18181A]">
              <Footer />
            </div> */}
          </main>
        </StyledEngineProvider>
      </body>
    </html>
  );
}
