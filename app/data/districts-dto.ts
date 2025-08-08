import "server-only";

export async function getDistrictDTO(id: string) {
  // Don't pass values, read back cached values, also solves context and easier to make it lazy
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const district = await fetch(`${baseUrl}/api/districts/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const foundation = await fetch(`${baseUrl}/api/foundation/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!district.ok) {
    throw new Error(
      `Failed to load district: ${district.status} ${district.statusText}`,
    );
  }

  const json = await district.json();

  const enriched = {
    ...json,
    foundation: foundation ??
      null,
  };
  return enriched;
  // only return the data relevant for this query and not everything
  // <https://www.w3.org/2001/tag/doc/APIMinimization>
  // return {
  //   username: canSeeUsername(currentUser) ? userData.username : null,
  //   phonenumber: canSeePhoneNumber(currentUser, userData.team)
  //     ? userData.phonenumber
  //     : null,
  // }
}
