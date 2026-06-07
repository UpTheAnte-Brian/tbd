export type FeatureFlags = {
  governanceTabsEnabled: boolean;
  mapTabEnabled: boolean;
  agentTabEnabled: boolean;
  usersTabEnabled?: boolean;
};

const parseEnvFlag = (value: string | undefined) => value === "true";

export function getFeatureFlags(): FeatureFlags {
  const usersTabEnabled = process.env.NEXT_PUBLIC_FEATURE_USERS_TAB;

  return {
    governanceTabsEnabled: parseEnvFlag(
      process.env.NEXT_PUBLIC_FEATURE_GOVERNANCE_TABS,
    ),
    mapTabEnabled: parseEnvFlag(process.env.NEXT_PUBLIC_FEATURE_MAP_TAB),
    agentTabEnabled: process.env.NEXT_PUBLIC_FEATURE_AGENT_TAB === undefined
      ? true
      : parseEnvFlag(process.env.NEXT_PUBLIC_FEATURE_AGENT_TAB),
    ...(usersTabEnabled === undefined
      ? {}
      : { usersTabEnabled: parseEnvFlag(usersTabEnabled) }),
  };
}
