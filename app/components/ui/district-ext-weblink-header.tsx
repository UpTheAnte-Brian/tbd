"use client";

import dynamicIconImports from "lucide-react/dynamicIconImports";
type IconName = keyof typeof dynamicIconImports;
import DynamicIcon from ".././DynamicIcon";
import React from "react";

interface DistrictExtWebLinkHeaderProps {
  name: string;
  url?: string;
}

const DistrictExtWebLinkHeader: React.FC<DistrictExtWebLinkHeaderProps> = ({
  name,
  url,
}) => {
  if (!url) {
    return <div className="text-lg font-semibold text-gray-700">{name}</div>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-lg font-semibold text-blue-600 flex items-center gap-2 hover:underline"
    >
      {name}
      {/* External link icon (fixed color + larger size) */}
      <span className="w-6 flex justify-center items-center flex-shrink-0">
        <DynamicIcon
          name={"external-link" as IconName}
          className="w-5 h-5 stroke-blue-700 group-hover:stroke-blue-900"
        />
      </span>
    </a>
  );
};

export default DistrictExtWebLinkHeader;
