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
    return (
      <div className="text-lg font-semibold text-brand-secondary-0">
        {name}
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2 text-lg font-semibold text-brand-secondary-0 hover:underline"
    >
      {name}
      {/* External link icon (fixed color + larger size) */}
      <span className="w-6 flex justify-center items-center flex-shrink-0">
        <DynamicIcon
          name={"external-link" as IconName}
          className="h-5 w-5 stroke-brand-secondary-0 group-hover:stroke-brand-primary-0"
        />
      </span>
    </a>
  );
};

export default DistrictExtWebLinkHeader;
