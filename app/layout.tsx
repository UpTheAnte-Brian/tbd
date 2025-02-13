import "@/app/ui/global.css";
import { inter } from "@/app/ui/fonts";
import NavBar from "./ui/dashboard/nav-bar";
import Footer from "./ui/dashboard/footer";

// This sets the title on your browser tab.
export const metadata = {
  title: "Home",
  description: "Ante Up Nation",
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
        className={`${inter.className} antialiased flex flex-col min-h-screen p-1`}
      >
        {/* <div className="outline rounded-lg inset-0"> */}
        <NavBar />
        {/* </div> */}
        <main className="flex-auto flex-col p-1">
          {children}
          {/* <div className="flex-grow outline rounded-lg inset-0"></div> */}
        </main>
        {/* <div className="outline rounded-lg inset-0"> */}
        <Footer />
        {/* </div> */}
      </body>
      {/* <body class="flex flex-col min-h-screen">
    <header>...</header>
    <main class="flex-auto">...</main>
    <footer>...</footer>
</body> */}
    </html>
  );
}
