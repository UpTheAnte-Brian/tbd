"use client";

import React from "react";

const MarkerComponent = React.memo((path: string) => {
  const logoPath =
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_LOGO_PATH ??
    process.env.SUPABASE_STORAGE_LOGO_PATH; // TODO: remove SUPABASE_STORAGE_LOGO_PATH fallback after migration

  return (
    <div>
      <img
        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}${logoPath ?? ""}${path}`}
        alt="Logo"
        className="h-10 object-contain"
      />
    </div>
  );
});

export default MarkerComponent;
