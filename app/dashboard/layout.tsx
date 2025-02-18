import SideNav from "@/app/ui/dashboard/sidenav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:overflow-hidden">
      <div className="flex-grow md:overflow-y-auto px-3 py-4 md:px-2">
        {children}
      </div>
      <div className="w-full items-end justify-start rounded-md bg-blue-600 p-4 md:w-64">
        <SideNav />
      </div>
    </div>
  );
}
