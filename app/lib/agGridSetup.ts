// AG Grid global setup (side-effects only)
//
// - Imports legacy CSS themes (ag-grid.css + ag-theme-quartz.css)
// - Registers the community module bundle once via ModuleRegistry
//
// This file intentionally has:
// - NO exports
// - NO "use client" directive
//
// It should be imported from client components that render AG Grid.

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";

// Register all Community features once
ModuleRegistry.registerModules([AllCommunityModule]);
