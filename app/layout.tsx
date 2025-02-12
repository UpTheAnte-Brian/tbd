import "@/app/ui/global.css";
import { inter } from "@/app/ui/fonts";
import NavBar from "./ui/dashboard/nav-bar";

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
      <body className={`${inter.className} antialiased`}>
        <main className="flex min-h-screen flex-col p-2">
          <NavBar />
          <div className="outline rounded-lg">{children}</div>
        </main>
      </body>
    </html>
  );
}
