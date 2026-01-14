import type { Database } from "@/database.types";

export type ColorRole = Database["branding"]["Enums"]["color_role"];

export type PaletteColorVM = {
  id?: string;
  slot: number;
  hex: string;
  label?: string | null;
  usage_notes?: string | null;
};

export type PaletteVM = {
  id: string;
  entity_id: string;
  role: ColorRole;
  name: string;
  usage_notes?: string | null;
  colors: PaletteColorVM[];
  created_at?: string | null;
  updated_at?: string | null;
};
