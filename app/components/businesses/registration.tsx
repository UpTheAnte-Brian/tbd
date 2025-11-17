// import { useEffect, useState } from "react";

// interface BusinessClaim {
//   id: string;
//   place_id: string;
//   place_name: string;
//   place_address: string;
//   status: string;
//   claimed_at: string;
// }

// export default function BusinessRegistration() {
//   const [claims, setClaims] = useState<BusinessClaim[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   const loadClaims = async () => {
//     try {
//       const res = await fetch("/api/business-claims");
//       if (!res.ok) throw new Error("Failed to load business claims");
//       const data = await res.json();
//       setClaims(data);
//     } catch (err: any) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const verifyClaim = async (id: string) => {
//     const res = await fetch("/api/business-claims/verify", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ id }),
//     });

//     const result = await res.json();
//     if (!res.ok) {
//       alert(result.error || "Failed to verify");
//       return;
//     }

//     loadClaims();
//   };

//   useEffect(() => {
//     loadClaims();
//   }, []);

//   if (loading) {
//     return <div className="text-black p-4">Loading business data…</div>;
//   }

//   if (error) {
//     return <div className="text-red-600 p-4">Error: {error}</div>;
//   }

//   return (
//     <div className="p-4 text-black">
//       <h2 className="text-2xl font-bold mb-4">My Claimed Business</h2>

//       {claims.length === 0 && <div>No claimed businesses yet.</div>}

//       <div className="space-y-4">
//         {claims.map((claim) => (
//           <div key={claim.id} className="border rounded p-4 shadow-sm bg-white">
//             <div className="font-semibold text-lg">{claim.place_name}</div>
//             <div className="text-sm text-gray-600">{claim.place_address}</div>
//             <div className="mt-2">
//               Status:{" "}
//               <span
//                 className={
//                   claim.status === "verified"
//                     ? "text-green-600 font-semibold"
//                     : "text-orange-600 font-semibold"
//                 }
//               >
//                 {claim.status}
//               </span>
//             </div>

//             {claim.status !== "verified" && (
//               <button
//                 onClick={() => verifyClaim(claim.id)}
//                 className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
//               >
//                 Mark Verified
//               </button>
//             )}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }
