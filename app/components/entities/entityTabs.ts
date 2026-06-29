import type { EntityType } from "@/domain/entities/types";

export type EntityTabKey =
  | "overview"
  | "documents"
  | "contacts"
  | "people"
  | "bookkeeping"
  | "users"
  | "branding"
  | "governance"
  | "agent"
  | "irs"
  | "map"
  | "superintendent";

export type EntityTabContext = {
  entityType: EntityType | null;
  hasIrsLink?: boolean | null;
  canViewDistrictGovernance?: boolean;
  isPlatformAdmin?: boolean;
  canManageUsersForEntity?: boolean;
  canReadDocumentsForEntity?: boolean;
  canViewAgentForEntity?: boolean;
  canReadBookkeepingForEntity?: boolean;
  featureFlags: {
    governanceTabsEnabled: boolean;
    mapTabEnabled: boolean;
    agentTabEnabled: boolean;
    usersTabEnabled?: boolean;
  };
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
    key: "documents",
    label: "Documents",
    order: 20,
    isVisible: (context) => Boolean(context.canReadDocumentsForEntity),
  },
  {
    key: "superintendent",
    label: "Superintendent",
    order: 25,
    isVisible: (context) => context.entityType === "district",
  },
  {
    key: "contacts",
    label: "Contacts",
    order: 30,
    isVisible: (context) => context.entityType !== "nonprofit",
  },
  {
    key: "people",
    label: "People",
    order: 35,
    isVisible: (context) => Boolean(context.canManageUsersForEntity),
  },
  {
    key: "bookkeeping",
    label: "Bookkeeping",
    order: 38,
    isVisible: (context) =>
      context.entityType === "business" &&
      Boolean(context.canReadBookkeepingForEntity),
  },
  {
    key: "branding",
    label: "Branding",
    order: 40,
    isVisible: () => true,
  },
  {
    key: "users",
    label: "Users",
    order: 50,
    isVisible: (context) =>
      Boolean(context.canManageUsersForEntity) &&
      context.entityType !== "nonprofit",
  },
  {
    key: "governance",
    label: "Governance",
    order: 60,
    isVisible: (context) => {
      if (!context.isPlatformAdmin) {
        return false;
      }
      if (!context.featureFlags.governanceTabsEnabled) {
        return false;
      }
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
    key: "agent",
    label: "Agent",
    order: 65,
    isVisible: (context) =>
      Boolean(context.canViewAgentForEntity) &&
      context.featureFlags.agentTabEnabled,
  },
  {
    key: "irs",
    label: "IRS",
    order: 70,
    isVisible: (context) => Boolean(context.hasIrsLink),
  },
  {
    key: "map",
    label: "Map",
    order: 80,
    isVisible: (context) =>
      Boolean(context.isPlatformAdmin) && context.featureFlags.mapTabEnabled,
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
