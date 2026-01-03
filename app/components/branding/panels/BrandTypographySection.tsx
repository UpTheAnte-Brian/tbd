"use client";

import { useMemo, useState } from "react";
import { Type as TypeIcon } from "lucide-react";
import AccordionCard from "@/app/components/user/AccordionCard";
import TypographyEditor from "@/app/components/branding/TypographyEditor";
import { TypographyShowcase } from "@/app/components/branding/TypographyShowcase";
import type {
  BrandingTypography,
  FontRole,
} from "@/app/lib/types/types";

const FONT_ROLES: FontRole[] = [
  "header1",
  "header2",
  "subheader",
  "body",
  "logo",
  "display",
];
const FONT_ROLE_LABELS: Record<string, string> = {
  header1: "Header One",
  header2: "Header Two",
  subheader: "Subheader",
  body: "Body / Paragraph",
  logo: "Logo (reference)",
  display: "Display / Accent",
};
const DEFAULT_TYPOGRAPHY: Record<
  FontRole,
  Pick<BrandingTypography, "font_name" | "availability" | "weights" | "usage_rules">
> = {
  body: {
    font_name: "",
    availability: "system",
    weights: [],
    usage_rules: "",
  },
  display: {
    font_name: "",
    availability: "system",
    weights: [],
    usage_rules: "",
  },
  logo: {
    font_name: "",
    availability: "system",
    weights: [],
    usage_rules: "",
  },
  header1: {
    font_name: "",
    availability: "system",
    weights: [],
    usage_rules: "",
  },
  header2: {
    font_name: "",
    availability: "system",
    weights: [],
    usage_rules: "",
  },
  subheader: {
    font_name: "",
    availability: "system",
    weights: [],
    usage_rules: "",
  },
};

interface Props {
  entityId: string | null;
  typography: BrandingTypography[];
  canEdit: boolean;
  onRefresh: () => void;
}

export default function BrandTypographySection({
  entityId,
  typography,
  canEdit,
  onRefresh,
}: Props) {
  const [showTypographyEditor, setShowTypographyEditor] = useState(false);
  const [selectedTypographyRole, setSelectedTypographyRole] =
    useState<string>("body");

  const typographyWithDefaults = useMemo(() => {
    if (!entityId) return [];
    return FONT_ROLES.map((role) => {
      const row = typography.find((t) => t.role === role) || null;
      if (row) return row;
      const defaults = DEFAULT_TYPOGRAPHY[role];
      return {
        id: `default-${role}`,
        entity_id: entityId,
        role,
        font_name: defaults.font_name,
        availability: defaults.availability,
        weights: defaults.weights,
        usage_rules: defaults.usage_rules,
        download_url: null,
        heading_font: null,
        body_font: null,
        accent_font: null,
        created_at: "",
        updated_at: "",
      } as BrandingTypography;
    });
  }, [entityId, typography]);

  return (
    <>
      {showTypographyEditor && entityId && (
        <div className="fixed inset-0 z-50 flex justify-end items-center">
          <div
            className="absolute inset-0 bg-brand-primary-0"
            style={{ opacity: 0.8 }}
          />
          <div className="relative z-10 w-full max-w-md max-h-[calc(100vh-2rem)] bg-brand-primary-0 text-brand-primary-1 border border-brand-primary-1 shadow-xl p-4 overflow-y-auto rounded-lg mr-2">
            <TypographyEditor
              entityId={entityId}
              typography={typographyWithDefaults}
              role={selectedTypographyRole}
              onSaved={() => {
                onRefresh();
                setShowTypographyEditor(false);
              }}
              onClose={() => setShowTypographyEditor(false)}
            />
          </div>
        </div>
      )}

      <AccordionCard
        title={
          <span className="flex items-center gap-2">
            <TypeIcon size={18} />
            Typography
          </span>
        }
      >
        {!entityId ? (
          <div className="text-sm text-brand-accent-1">
            Missing entity mapping for this entity.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="text-sm text-brand-primary-1 opacity-80">
              Customize entity typography by role.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {typographyWithDefaults.map((t) => (
                <div
                  key={t.role ?? t.id}
                  className="border border-brand-primary-1 rounded bg-brand-secondary-0 p-3 shadow-sm text-brand-primary-1 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase text-brand-primary-1 opacity-70 mb-1">
                        {t.role
                          ? FONT_ROLE_LABELS[t.role as FontRole]
                          : "Typography"}
                      </div>
                      <div className="font-semibold text-brand-primary-1">
                        {t.font_name || "Not set"}
                      </div>
                      <div className="text-xs text-brand-primary-1 opacity-70 capitalize">
                        Availability: {t.availability ?? "system"}
                      </div>
                    </div>
                    {t.role && (
                      <button
                        onClick={() => {
                          setSelectedTypographyRole(t.role as string);
                          setShowTypographyEditor(true);
                        }}
                        className="px-2 py-1 text-xs rounded bg-brand-accent-1 text-brand-primary-1 hover:bg-brand-accent-2 disabled:opacity-50"
                        disabled={!canEdit}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {t.usage_rules && (
                    <div className="text-sm text-brand-primary-1 opacity-80 italic">
                      {t.usage_rules}
                    </div>
                  )}
                  <div className="text-xs text-brand-primary-1 opacity-70">
                    Weights:{" "}
                    {Array.isArray(t.weights) && t.weights.length > 0
                      ? t.weights.join(", ")
                      : "None"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </AccordionCard>

      <TypographyShowcase />
    </>
  );
}
