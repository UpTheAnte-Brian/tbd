"use client";

import { PlaceDetailsType, Profile } from "@/app/lib/types";
import React, { useState } from "react";

interface PlaceDetailsProps {
  place: PlaceDetailsType;
  user: Profile | null;
  onClose: () => void;
}

export default function PlaceDetails({
  place,
  user,
  onClose,
}: PlaceDetailsProps) {
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);

  async function handleClaimOwnership() {
    setLoading(true);
    const business = {
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry?.location.lat,
      lng: place.geometry?.location.lng,
      phone_number: place.formatted_phone_number,
      website: place.website,
      types: place.types,
    };

    const res = await fetch("/api/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id, business }),
    });

    if (!res.ok) {
      console.error("Failed to claim business");
    } else {
      console.log("Business claimed:", await res.json());
      setClaimed(true);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col bg-white shadow-lg rounded-t-lg md:rounded-none md:rounded-l-lg md:w-96 w-full h-full overflow-auto">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-black">{place.name}</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="text-gray-600 hover:text-gray-800 focus:outline-none"
        >
          ✕
        </button>
      </div>
      <div className="p-4 space-y-2">
        {place.formatted_address && (
          <p className="text-black">
            <strong className="text-black">Address:</strong>{" "}
            {place.formatted_address}
          </p>
        )}
        {place.formatted_phone_number && (
          <p className="text-black">
            <strong className="text-black">Phone:</strong>{" "}
            {place.formatted_phone_number}
          </p>
        )}
      </div>
      {user && (
        <div>
          <button
            onClick={handleClaimOwnership}
            disabled={loading || claimed}
            className={`w-full py-3 mt-auto font-semibold rounded-b-lg focus:outline-none ${
              claimed
                ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {loading
              ? "Claiming..."
              : claimed
              ? "Already claimed"
              : "This is my business, claim ownership"}
          </button>
        </div>
      )}
    </div>
  );
}
