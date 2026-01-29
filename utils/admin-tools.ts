export function areAdminToolsDisabled(): boolean {
  return process.env.ADMIN_TOOLS_DISABLED === "true";
}
