# Branch protection for `main` (apply once the GitHub repo exists)
Not applied yet: this repo has no GitHub remote and `gh` is not logged in.
```
gh api -X PUT repos/<owner>/<repo>/branches/main/protection --input - <<'JSON'
{"required_status_checks":{"strict":true,"contexts":["lint, typecheck, build","Codex tests (unit, accessibility)","security scan","validate Bicep"]},
 "enforce_admins":true,
 "required_pull_request_reviews":{"required_approving_review_count":1,"require_code_owner_reviews":true},
 "restrictions":null,"allow_force_pushes":false,"allow_deletions":false}
JSON
```
Also create GitHub environments `staging` and `production` (production: required reviewer Enahoro).
