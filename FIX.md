# FIX log

Running record of issues hit while building this repo and how each was fixed.
Newest entries on top.

---

## 2026-05-10 · `configmap "scg-asgn-be-config" not found` (no env suffix)
**Symptom:** BE pod fails to start: `configmap "scg-asgn-be-config" not found`. Actual ConfigMap is `scg-asgn-be-config-dev`.
**Cause:** Same root as the previous Rollout fixes — kustomize knows how to rewrite `configMapKeyRef.name` for native Deployments but not for the `Rollout` CRD, so the suffix wasn't applied to refs inside `spec.template.spec.containers[].env[].valueFrom.configMapKeyRef.name`.
**Fix:** Added `nameReference` field-spec entries for `ConfigMap` (and `Secret` for completeness) covering all the standard pod-spec paths: `env.valueFrom.configMapKeyRef.name`, `envFrom.configMapRef.name`, `volumes.configMap.name`, `volumes.projected.sources.configMap.name`, `imagePullSecrets.name`, etc. — mirrors what the built-in transformer does for Deployment.
**Files:** `project/scg-asgn/deployment/base/backend/kustomizeconfig.yaml`.

---

## 2026-05-10 · Rollout selector immutable after commonLabels fix
**Symptom:** Argo CD sync fails: `Rollout.argoproj.io "scg-asgn-be-dev" is invalid: spec.selector: Invalid value: .spec.selector is immutable`.
**Cause:** The previous fix added new labels to the Rollout's `spec.selector.matchLabels`. K8s forbids mutating selectors on existing controllers (would orphan replicasets).
**Fix:** One-time delete + recreate: `kubectl -n app-dev delete rollout scg-asgn-be-dev`; Argo CD then recreates with the corrected selector on next sync.
**Files:** none (cluster operation).

---

## 2026-05-10 · Argo Rollouts: Service has unmatch label `app.kubernetes.io/name`
**Symptom:** `InvalidSpec: spec.strategy.blueGreen.activeService: Service has unmatch label "app.kubernetes.io/name" in rollout`.
**Cause:** Kustomize `commonLabels` transformer knows native K8s kinds, so it added the labels to Service selectors but **not** to Rollout's `spec.selector.matchLabels` or pod template labels (CRD).
**Fix:** Extended `base/backend/kustomizeconfig.yaml` with `commonLabels` field specs pointing at `Rollout.spec.selector.matchLabels`, `Rollout.spec.template.metadata.labels`, and `commonAnnotations` for pod template annotations.
**Files:** `project/scg-asgn/deployment/base/backend/kustomizeconfig.yaml`.

---

## 2026-05-10 · Per-service overlay split — `kustomizeconfig.yaml` not reached
**Symptom:** `error: resource with name scg-asgn-be does not match a config with the following GVK [Deployment.[noVer]…]` when rendering `overlays/<env>/backend`.
**Cause:** After splitting overlays into per-service subdirs, the BE overlay imports `base/backend` directly, bypassing `base/kustomization.yaml` where `kustomizeconfig.yaml` was referenced.
**Fix:** Moved `kustomizeconfig.yaml` into `base/backend/` and referenced it from `base/backend/kustomization.yaml` (only BE has Rollout CRDs that need it).
**Files:** `project/scg-asgn/deployment/base/backend/kustomization.yaml`, `project/scg-asgn/deployment/base/backend/kustomizeconfig.yaml`, `project/scg-asgn/deployment/base/kustomization.yaml`.

---

## 2026-05-10 · Kustomize `replacements` in base didn't run after overlay `nameSuffix`
**Symptom:** FE `BACKEND_URL` rendered as `http://scg-asgn-be-active` (no env suffix) — pods would 500.
**Cause:** Replacements in base run on base resources before any overlay applies `nameSuffix`. The Service's `metadata.name` is still the unsuffixed value at that point.
**Fix:** Initially moved `replacements:` block into each overlay so it runs **after** `nameSuffix`. Later replaced entirely with a static `backend-url.yaml` patch per overlay (per-service split made the cross-resource replacement unworkable).
**Files:** `project/scg-asgn/deployment/overlays/<env>/frontend/backend-url.yaml`, each overlay's `frontend/kustomization.yaml`.

---

## 2026-05-10 · ApplicationSet rejected — booleans rendered as strings
**Symptom:** `ApplicationSet.argoproj.io "scg-asgn" is invalid: spec.template.spec.syncPolicy.automated.{prune,selfHeal}: Invalid value: "string": must be of type boolean`.
**Cause:** Used `'{{.prune}}'` directly in the Application template — YAML parses the quoted value as a string before Go-template substitution, so the rendered Application has `prune: "true"` instead of `prune: true`.
**Fix:** Moved per-env booleans into ApplicationSet `templatePatch:`. `templatePatch` is rendered as a string first then YAML-parsed, so `{{ .prune }}` becomes a real boolean.
**Files:** `argocd/managed/applicationset.yaml`.

---

## 2026-05-10 · Kustomize `replicas` transformer doesn't recognize Rollout
**Symptom:** `error: resource with name scg-asgn-be does not match a config with the following GVK [Deployment.[noVer]…]` when an overlay sets `replicas:` on a Rollout.
**Cause:** Built-in `replicas` transformer only knows native K8s kinds; doesn't know Argo's `Rollout` CRD has `spec.replicas` at the same path.
**Fix:** Added `replicas:` field-spec section to `kustomizeconfig.yaml` pointing at `Rollout.spec.replicas`.
**Files:** `project/scg-asgn/deployment/base/backend/kustomizeconfig.yaml`.

---

## 2026-05-09 · Frontend `/meta` reported pod = `0.0.0.0`
**Symptom:** Frontend pod self-info card showed `pod: 0.0.0.0`.
**Cause:** Next.js standalone Dockerfile sets `HOSTNAME=0.0.0.0` so the server binds to all interfaces, which clobbers the container's hostname env.
**Fix:** `app/meta/route.ts` now reads `process.env.POD_NAME || os.hostname()` instead of `process.env.HOSTNAME`. Downward API in K8s sets `POD_NAME` to `metadata.name`.
**Files:** `project/scg-asgn/frontend/app/meta/route.ts`, `project/scg-asgn/deployment/base/frontend/deployment.yaml`.

---

## 2026-05-09 · Frontend `/api/*` proxy 500s in compose
**Symptom:** `Failed to proxy http://localhost:8080/api/items [AggregateError: ECONNREFUSED]` from FE container in docker-compose.
**Cause:** Next.js with `output: "standalone"` evaluates `next.config.mjs` rewrites at **build time**, so `process.env.BACKEND_URL` was undefined during the build and fell back to `http://localhost:8080`. Setting the env at container runtime had no effect.
**Fix:** Removed `rewrites()` from `next.config.mjs`. Added `app/api/[...path]/route.ts` — a runtime route handler that reads `BACKEND_URL` at request time and proxies upstream. Works in compose, K8s, anywhere.
**Files:** `project/scg-asgn/frontend/next.config.mjs`, `project/scg-asgn/frontend/app/api/[...path]/route.ts`.

---

## 2026-05-09 · Frontend Dockerfile `COPY public` fails
**Symptom:** `failed to compute cache key: "/app/public": not found` during compose build.
**Cause:** Next.js 15 doesn't auto-create `public/` if you have no static assets, but the Dockerfile's `COPY` step expects it to exist.
**Fix:** Added `project/scg-asgn/frontend/public/.gitkeep`.
**Files:** `project/scg-asgn/frontend/public/.gitkeep`.

---

## 2026-05-09 · `npm ci` fails — no `package-lock.json`
**Symptom:** `npm error code EUSAGE … The 'npm ci' command can only install with an existing package-lock.json` during compose build.
**Cause:** Pinned React to a withdrawn RC (`19.0.0-rc-66855b96-20241106`) and never ran `npm install` locally to generate the lockfile.
**Fix:** Bumped to stable `react: ^19.0.0` and `@types/react: ^19.0.0`, then `npm install` once locally to produce `package-lock.json` (committed).
**Files:** `project/scg-asgn/frontend/package.json`, `project/scg-asgn/frontend/package-lock.json`.
