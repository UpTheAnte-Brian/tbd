import type { Database } from "@/database.types";

export type CreateBusinessRequest = {
  name: string;
  website?: string | null;
  address?: string | null;
  phone_number?: string | null;
  place_id?: string | null;
  types?: string[] | null;
  status?: Database["public"]["Tables"]["businesses"]["Row"]["status"] | null;
};

export type CreateBusinessResponse = {
  entity_id: string;
  business_id: string;
  slug: string;
};
