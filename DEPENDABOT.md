Dependabot Policy

This repository uses GitHub Dependabot for automated dependency updates.

Scope

Dependabot is enabled for:
	•	JavaScript / npm dependencies

Update Strategy
	•	Patch and minor updates are generally safe to merge once CI checks pass.
	•	Major version updates require manual review and may be deferred or closed if they introduce breaking changes or unnecessary churn.

Grouping & Intent

Dependencies that are tightly coupled (for example, framework core packages and their type definitions) are expected to be updated together. If Dependabot opens partial or incompatible upgrades, those pull requests may be edited, deferred, or closed in favor of a coordinated update.

Lockfiles

All dependency updates must include corresponding lockfile changes (package-lock.json). Pull requests missing lockfile updates will not be merged.

Philosophy

The goal of Dependabot in this repository is signal, not noise:
	•	Keep the dependency graph healthy
	•	Surface real security issues early
	•	Avoid unnecessary upgrades for unused or deprecated libraries

Automated updates are reviewed with long-term maintainability and architectural intent in mind.