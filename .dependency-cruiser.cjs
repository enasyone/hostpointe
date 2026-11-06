// Boundary rules from ADR-0001. One-way imports: apps -> integrations -> domain; web -> ui.
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    { name: "domain-imports-nothing-internal", severity: "error", from: { path: "^packages/domain/" }, to: { path: "^(apps|packages/(ui|integrations))/" } },
    { name: "ui-no-api-or-integrations", severity: "error", from: { path: "^packages/ui/" }, to: { path: "^(apps|packages/integrations)/" } },
    // ui may import domain TYPES only, never runtime code (ADR-0001).
    { name: "ui-domain-types-only", severity: "error", from: { path: "^packages/ui/" }, to: { path: "^packages/domain/", dependencyTypesNot: ["type-only"] } },
    { name: "nothing-imports-tests-or-database", severity: "error", from: { path: "^(apps|packages)/" }, to: { path: "^(tests|database)/" } },
    // Modules in apps/api expose only index.ts.
    { name: "api-module-internals-private", severity: "error", from: { path: "^apps/api/src/modules/([^/]+)/" }, to: { path: "^apps/api/src/modules/([^/]+)/(?!index\\.ts$)", pathNot: "^apps/api/src/modules/$1/" } },
    { name: "integrations-only-domain", severity: "error", from: { path: "^packages/integrations/" }, to: { path: "^(apps|packages/(ui))/" } },
    { name: "api-no-web-or-ui", severity: "error", from: { path: "^apps/api/" }, to: { path: "^(apps/web|packages/ui)/" } },
    { name: "web-no-api-or-integrations", severity: "error", from: { path: "^apps/web/" }, to: { path: "^(apps/api|packages/integrations)/" } },
  ],
  options: { tsConfig: { fileName: "tsconfig.base.json" }, doNotFollow: { path: "node_modules" } },
};
