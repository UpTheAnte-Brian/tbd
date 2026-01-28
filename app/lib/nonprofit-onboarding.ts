export const ONBOARDING_SECTIONS = [
  "identity",
  "irs_link",
  "documents",
  "review",
  "activation",
] as const;

export type OnboardingSection = (typeof ONBOARDING_SECTIONS)[number];

export type OnboardingSectionStatus =
  | "pending"
  | "in_progress"
  | "complete"
  | "skipped";

export const ONBOARDING_SECTION_LABELS: Record<OnboardingSection, string> = {
  identity: "Identity",
  irs_link: "IRS Link",
  documents: "Documents",
  review: "Review & Overrides",
  activation: "Activate",
};
