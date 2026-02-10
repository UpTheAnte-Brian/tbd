import type { EntityType } from "@/domain/entities/types";

export type EntityDirectoryRow = {
  entity_id: string;
  name: string;
  short_name?: string | null;
  entity_type: EntityType;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  district_number?: string | null;
};
