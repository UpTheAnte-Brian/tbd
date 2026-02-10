import type { EntityType } from "@/domain/entities/types";

export type EntityTabKey =
  | "overview"
  | "contacts"
  | "users"
  | "branding"
  | "governance"
  | "irs"
  | "map"
  | "superintendent";

export type EntityTabContext = {
  entityType: EntityType | null;
  hasIrsLink?: boolean | null;
  canViewDistrictGovernance?: boolean;
};

export type EntityTabDefinition = {
  key: EntityTabKey;
  label: string;
  order: number;
  isVisible: (context: EntityTabContext) => boolean;
};

const ENTITY_TABS: EntityTabDefinition[] = [
  {
    key: "overview",
    label: "Overview",
    order: 10,
    isVisible: () => true,
  },
  {
    key: "contacts",
    label: "Contacts",
    order: 20,
    isVisible: () => true,
  },
  {
    key: "users",
    label: "Users",
    order: 30,
    isVisible: () => true,
  },
  {
    key: "branding",
    label: "Branding",
    order: 40,
    isVisible: () => true,
  },
  {
    key: "governance",
    label: "Governance",
    order: 50,
    isVisible: (context) => {
      if (
        context.entityType === "district" &&
        context.canViewDistrictGovernance === false
      ) {
        return false;
      }
      return true;
    },
  },
  {
    key: "irs",
    label: "IRS",
    order: 60,
    isVisible: (context) => Boolean(context.hasIrsLink),
  },
  {
    key: "map",
    label: "Map",
    order: 70,
    isVisible: () => true,
  },
  {
    key: "superintendent",
    label: "Superintendent",
    order: 80,
    isVisible: (context) => context.entityType === "district",
  },
];

const ENTITY_TAB_KEYS = new Set<EntityTabKey>(
  ENTITY_TABS.map((tab) => tab.key),
);

export function isEntityTabKey(value: string): value is EntityTabKey {
  return ENTITY_TAB_KEYS.has(value as EntityTabKey);
}

export function getEntityTabDefinition(
  key: EntityTabKey,
): EntityTabDefinition {
  const tab = ENTITY_TABS.find((candidate) => candidate.key === key);
  if (!tab) {
    throw new Error(`Unknown entity tab: ${key}`);
  }
  return tab;
}

export function getEntityTabLabel(
  key: EntityTabKey,
  context: EntityTabContext,
): string {
  if (key === "governance" && context.entityType === "district") {
    return "School Board";
  }
  if (key === "superintendent" && context.entityType === "district") {
    return "District Dashboard";
  }
  return getEntityTabDefinition(key).label;
}

export function getVisibleEntityTabs(
  context: EntityTabContext,
): EntityTabDefinition[] {
  return ENTITY_TABS.filter((tab) => tab.isVisible(context)).sort(
    (a, b) => a.order - b.order,
  );
}

export function getVisibleEntityTabKeys(
  context: EntityTabContext,
): EntityTabKey[] {
  return getVisibleEntityTabs(context).map((tab) => tab.key);
}
