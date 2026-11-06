// Boundary rules from ADR-0001. One-way imports: apps -> integrations -> domain; web -> ui; ui -> domain (types only).
// Workspace packages resolve through dist/, so run `pnpm build` before `pnpm lint:boundaries`.
const FRAMEWORKS = "^(react|react-dom|next|@nestjs/.*|pg|node:.*|fs|path|net|http|https|child_process|os|crypto|dns|tls|stream|zlib)$";
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    // Guard: an unresolved import would match no other rule and pass quietly.
    { name: "not-to-unresolvable", severity: "error", from: {}, to: { couldNotResolve: true } },
    { name: "domain-imports-nothing-internal", severity: "error", from: { path: "^packages/domain/src" }, to: { path: "^(apps|packages/(ui|integrations))/|^(tests|database)/" } },
    { name: "domain-no-framework-or-node", severity: "error", from: { path: "^packages/domain/src" }, to: { dependencyTypes: ["npm", "npm-dev", "npm-peer", "npm-optional", "core"], path: FRAMEWORKS } },
    { name: "domain-no-core-modules", severity: "error", from: { path: "^packages/domain/src" }, to: { dependencyTypes: ["core"] } },
    { name: "ui-no-api-or-integrations", severity: "error", from: { path: "^packages/ui/src" }, to: { path: "^(apps|packages/integrations)/" } },
    // ui may import domain TYPES only, never runtime code.
    { name: "ui-domain-types-only", severity: "error", from: { path: "^packages/ui/src" }, to: { path: "^packages/domain/", dependencyTypesNot: ["type-only"] } },
    { name: "integrations-only-domain", severity: "error", from: { path: "^packages/integrations/src" }, to: { path: "^(apps|packages/ui)/" } },
    { name: "api-no-web-or-ui", severity: "error", from: { path: "^apps/api/src" }, to: { path: "^(apps/web|packages/ui)/" } },
    { name: "web-no-api-or-integrations", severity: "error", from: { path: "^apps/web/(app|src)" }, to: { path: "^(apps/api|packages/integrations)/" } },
    { name: "web-and-integrations-no-pg", severity: "error", from: { path: "^(apps/web/(app|src)|packages/integrations/src)" }, to: { dependencyTypes: ["npm", "npm-dev"], path: "^pg$" } },
    { name: "nothing-imports-tests-or-database", severity: "error", from: { path: "^(apps|packages)/" }, to: { path: "^(tests|database)/" } },
    // Modules in apps/api expose only index.ts to other modules.
    { name: "api-module-internals-private", severity: "error",
      from: { path: "^apps/api/src/modules/([^/]+)/" },
      to: { path: "^apps/api/src/modules/[^/]+/.+", pathNot: "^apps/api/src/modules/$1/|^apps/api/src/modules/[^/]+/index\\.ts$" } },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.base.json" },
    tsPreCompilationDeps: true,
    doNotFollow: { path: "node_modules" },
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "require", "node", "default", "types"], mainFields: ["types", "main"] },
  },
};
