"use server";

import "@/app/lib/styles/style.css";
import { inter } from "./lib/styles/fonts";
import { StyledEngineProvider } from "@mui/material";
import NavBarComponent from "@/app/components/nav/NavBar";
import GoogleMapsProvider from "@/app/lib/providers/GoogleMapsProvider";
import { HydrationBoundary, DehydratedState } from "@tanstack/react-query";
import ReactQueryProvider from "@/app/lib/providers/ReactQueryProvider";
import { getCurrentProfile } from "@/app/data/users";
import UserProviderClient from "@/app/providers/UserProviderClient";

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
  const serverUser = await getCurrentProfile();

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
        <ReactQueryProvider>
          <HydrationBoundary
            state={{ queries: [], mutations: [] } as DehydratedState}
          >
            <GoogleMapsProvider>
              <StyledEngineProvider injectFirst>
                <main className="relative">
                  {/* Header: Fixed position, ensure content flows below it */}
                  <UserProviderClient initialUser={serverUser}>
                    <header className="h-16 text-[15px] fixed top-0 w-full bg-[#18181A] z-[999]">
                      <NavBarComponent></NavBarComponent>
                    </header>

                    {/* Main Content Area: Use padding-top to create space below the fixed header */}
                    <div className="pt-16 min-h-screen bg-uta-primary-dark">
                      {/* Added pt- to account for header height */}

                      {children}
                    </div>

                    {/* Footer */}
                    {/* <div className="min-h-10vh bg-[#18181A]">
                    <Footer />
                  </div> */}
                  </UserProviderClient>
                </main>
              </StyledEngineProvider>
            </GoogleMapsProvider>
          </HydrationBoundary>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
