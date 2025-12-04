"use client";
import BusinessAdmin from "@/app/components/businesses/admin";
import BusinessOverview from "@/app/components/businesses/overview";
import { Business, Profile } from "@/app/lib/types/types";
import React, { useState } from "react";

export default function BusinessPanels({
  user,
  business,
  reloadBusiness,
}: {
  user: Profile | null;
  business: Business;
  reloadBusiness: () => void;
}) {
  const tabs = ["Overview", "Admin", "Calendar"];
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <div>
      <div className="flex border-b border-gray-300">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 -mb-px border-b-2 font-medium ${
              activeTab === tab
                ? "border-blue-500 bg-white text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="p-4 bg-white border border-t-0 border-gray-300">
        {activeTab === "Admin" && user ? (
          <BusinessAdmin
            user={user}
            business={business}
            reloadBusiness={reloadBusiness}
          ></BusinessAdmin>
        ) : activeTab === "Overview" ? (
          <BusinessOverview business={business} />
        ) : (
          <>
            <h2 className="text-xl font-semibold text-black">
              {activeTab} Panel
            </h2>
            <p className="text-black">
              This is the placeholder content for the {activeTab} tab.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
