import { PHASE_PRODUCTION_BUILD } from "next/constants";

export function isBuildTime(): boolean {
  return process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;
}
