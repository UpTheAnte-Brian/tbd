import "server-only";

export async function getFoundationDTO(id: string) {
    // Don't pass values, read back cached values, also solves context and easier to make it lazy
    const baseUrl = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";
    const foundation = await fetch(`${baseUrl}/api/foundations/${id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    if (!foundation.ok) {
        throw new Error(
            `Failed to load district: ${foundation.status} ${foundation.statusText}`,
        );
    }

    const json = await foundation.json();

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
