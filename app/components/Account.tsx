"use client";
import { Profile } from "@/app/lib/types/types";
import MyProfile from "@/app/components/user/MyProfile";
import MyDistricts from "@/app/components/user/MyDistricts";
import MyBusinesses from "@/app/components/user/MyBusinesses";
import MyNonprofits from "@/app/components/user/MyNonprofits";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function AccountForm({ user }: { user: Profile | null }) {
  return (
    <div className="mt-12 w-full max-w-5xl mx-auto px-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <MyProfile />
        </div>
        <div className="space-y-4">
          <MyBusinesses />
          <MyNonprofits />
          <MyDistricts />
        </div>
      </div>
    </div>
  );
}
