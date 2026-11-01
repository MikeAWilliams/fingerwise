# Deployment

fingerwise is published as static files to GitHub Pages by one GitHub Actions workflow. Live site: <https://mikeawilliams.github.io/fingerwise/>. Design: [feature 2](../features/02-deploy-and-pwa/design.md); PWA decision: [ADR 0004](decisions/0004-pwa-with-vite-plugin-pwa.md).

## Workflow

`.github/workflows/deploy.yml`, named "Verify and deploy".

| Trigger             | `verify` | `deploy`                         |
| ------------------- | -------- | -------------------------------- |
| Push to any branch  | runs     | only on `main`                   |
| `workflow_dispatch` | runs     | only when run from `main`        |

- **`verify`** installs from the frozen lockfile and runs `make check`, `make typecheck`, `make test` and `make build`: the same checks as `make verify`, as separate steps so a failure names the step. On `main` it uploads `dist/` as the Pages artifact.
- **`deploy`** `needs: verify`, so a failing check never deploys. It publishes the artifact with `actions/deploy-pages` into the `github-pages` environment.
- **Main-only rule:** the `if:` on `deploy` (and on the artifact upload) is `github.ref == 'refs/heads/main'`. Manual runs are therefore allowed only from `main`.

## Permissions and concurrency

- Workflow default: `contents: read`.
- `deploy` adds `pages: write` and `id-token: write`.
- `deploy` has `concurrency: { group: pages, cancel-in-progress: false }`, so deploys queue and never overlap. It is scoped to the job so `verify` runs on other branches stay parallel.

## Pinned versions

Bun is pinned in the `verify` job (`bun-version` on `oven-sh/setup-bun`). Bump it there when the local Bun version changes. GitHub's own actions use major-version tags.

## URL and `base`

The site is served under `/fingerwise/`, which is the `base` in `vite.config.ts`. Change both together if the repository is renamed.

## One-time repository settings

Done by hand in the GitHub UI; the workflow cannot set them:

- Settings > Pages > Source: "GitHub Actions".
- Settings > Environments > `github-pages`: deployment branches limited to `main`.
