"use client";

import { PlaceDetailsType } from "@/app/lib/types";
import React from "react";

interface PlaceDetailsProps {
  place: PlaceDetailsType;
  onClose: () => void;
  onClaimOwnership: () => void;
}

export default function PlaceDetails({
  place,
  onClose,
  onClaimOwnership,
}: PlaceDetailsProps) {
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
      <div>
        <button
          onClick={onClaimOwnership}
          className="w-full py-3 mt-auto bg-blue-600 text-white font-semibold rounded-b-lg hover:bg-blue-700 focus:outline-none"
        >
          This is my business, claim ownership
        </button>
      </div>
    </div>
  );
}
