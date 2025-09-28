"use server";

import "@/app/ui/style.css";
import { inter } from "./ui/fonts";
import { StyledEngineProvider } from "@mui/material";
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
  return (
    <html lang="en">
      <head></head>
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
