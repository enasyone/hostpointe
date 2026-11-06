// Boundary rules from ADR-0001. One-way imports: apps -> integrations -> domain; web -> ui.
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    { name: "domain-imports-nothing-internal", severity: "error", from: { path: "^packages/domain/" }, to: { path: "^(apps|packages/(ui|integrations))/" } },
    { name: "ui-no-domain-or-api", severity: "error", from: { path: "^packages/ui/" }, to: { path: "^(apps|packages/(domain|integrations))/" } },
    { name: "integrations-only-domain", severity: "error", from: { path: "^packages/integrations/" }, to: { path: "^(apps|packages/(ui))/" } },
    { name: "api-no-web-or-ui", severity: "error", from: { path: "^apps/api/" }, to: { path: "^(apps/web|packages/ui)/" } },
    { name: "web-no-api-or-integrations", severity: "error", from: { path: "^apps/web/" }, to: { path: "^(apps/api|packages/integrations)/" } },
  ],
  options: { tsConfig: { fileName: "tsconfig.base.json" }, doNotFollow: { path: "node_modules" } },
};
