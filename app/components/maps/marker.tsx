"use client";

import React from "react";

const MarkerComponent = React.memo((path: string) => {
  return (
    <div>
      <img
        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}${process.env.SUPABASE_STORAGE_LOGO_PATH}${path}`}
        alt="Logo"
        className="h-10 object-contain"
      />
    </div>
  );
});

export default MarkerComponent;
