import "./ui/global.css";
import { inter } from "./ui/fonts";
import NavBar from "./ui/dashboard/nav-bar";
import Footer from "./ui/dashboard/footer";
// import { StyledEngineProvider } from "@mui/material";

// This sets the title on your browser tab.
export const metadata = {
  title: "Home",
  // description: "Ante Up Nation",
  description: "React Skills developkment",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* <head></head> */}
      <body
        className={`${inter.className} antialiased flex flex-col min-h-100vh p-1`}
      >
        {/* <StyledEngineProvider injectFirst> */}
        <div className="min-h-10svh">
          <NavBar />
        </div>
        <main className="min-h-80svh p-1">
          {children}
          {/* <div className="flex-grow outline rounded-lg inset-0"></div> */}
        </main>
        <div className="outline rounded-lg inset-0 min-h-10svh">
          <Footer />
        </div>
        {/* </StyledEngineProvider> */}
      </body>
      {/* <body class="flex flex-col min-h-screen">
    <header>...</header>
    <main class="flex-auto">...</main>
    <footer>...</footer>
</body> */}
    </html>
  );
}
