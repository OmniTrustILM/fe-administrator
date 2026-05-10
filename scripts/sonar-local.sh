#!/usr/bin/env bash
# Local SonarQube analysis for fe-administrator.
# Spins up an ephemeral SonarQube Community container, runs the project's
# Vitest coverage suite, then runs sonar-scanner against the local instance,
# and prints the quality gate + open issues.
#
# Usage: ./scripts/sonar-local.sh
#
# Requirements:
#   - Docker running (used for both SonarQube and the sonar-scanner image)
#   - Node + npm available (the script does NOT install node modules; run
#     `npm install` first if the workspace is fresh)
#   - curl and python3 on PATH (used to drive the SonarQube REST API and parse JSON)
#   - The project's existing sonar-project.properties is honoured as-is
#
# IMPORTANT — Limitation of ephemeral SonarQube:
# The SonarQube container is freshly started on every run, so it has no
# previous analysis to use as a "new code" baseline. The Quality Gate's
# new-code conditions therefore evaluate trivially OK and do NOT match the
# behaviour you'll see on SonarCloud (where a real baseline exists). To
# approximate PR-style focus locally, this script intersects the Sonar
# issue list with `git diff --name-only main...HEAD` and reports only
# issues on changed files. Use it as a smoke check; treat SonarCloud on
# the actual PR as authoritative.
set -euo pipefail

CONTAINER_NAME="fe-sonarqube"
SONAR_PORT="${SONAR_PORT:-9000}"
PROJECT_KEY="fe-administrator"
SONAR_URL="http://localhost:${SONAR_PORT}"

cleanup() {
    echo "Stopping SonarQube..."
    docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

if ! docker info >/dev/null 2>&1; then
    echo "ERROR: Docker is required (used for SonarQube and the sonar-scanner image)." >&2
    exit 1
fi

for tool in npm curl python3; do
    if ! command -v "${tool}" >/dev/null 2>&1; then
        echo "ERROR: ${tool} not found on PATH." >&2
        exit 1
    fi
done

if [[ ! -d node_modules ]]; then
    echo "ERROR: node_modules missing. Run 'npm install' first." >&2
    exit 1
fi

docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

echo "Starting SonarQube Community on port ${SONAR_PORT}..."
docker run -d --name "${CONTAINER_NAME}" -p "${SONAR_PORT}:9000" sonarqube:community >/dev/null

echo "Waiting for SonarQube to be ready (up to 2 minutes)..."
for i in $(seq 1 120); do
    if curl -sf "${SONAR_URL}/api/system/status" 2>/dev/null | grep -q '"status":"UP"'; then
        echo "SonarQube is ready."
        break
    fi
    if [[ "$i" -eq 120 ]]; then
        echo "ERROR: SonarQube failed to start within 2 minutes." >&2
        exit 1
    fi
    sleep 1
done

echo "Configuring SonarQube..."
# SonarQube ships with `admin/admin` as the factory default; the server forces
# this password to be changed on first login. We rotate it to `Admin12345678!`
# (a value that satisfies SonarQube's password policy) so the rest of the script
# can authenticate. Both credentials are scoped to this ephemeral container only —
# the container is removed by the EXIT trap, so neither value is persisted.
curl -s -o /dev/null -u admin:admin -X POST \
    "${SONAR_URL}/api/users/change_password?login=admin&previousPassword=admin&password=Admin12345678!" 2>/dev/null || true

if curl -sf -u admin:Admin12345678! "${SONAR_URL}/api/system/status" >/dev/null 2>&1; then
    SONAR_CREDS="admin:Admin12345678!"
elif curl -sf -u admin:admin "${SONAR_URL}/api/system/status" >/dev/null 2>&1; then
    SONAR_CREDS="admin:admin"
else
    echo "ERROR: Cannot authenticate to SonarQube." >&2
    exit 1
fi

# Pre-create the project so we can bind quality profiles to it before the first
# scan. /api/projects/create is idempotent enough for our purposes — if the
# project already exists, the call returns 400 which we tolerate.
curl -s -o /dev/null -u "${SONAR_CREDS}" -X POST \
    --data-urlencode "name=${PROJECT_KEY}" \
    --data-urlencode "project=${PROJECT_KEY}" \
    "${SONAR_URL}/api/projects/create" || true

# Import the SonarCloud quality profiles checked into sonar/profiles/ so the
# local scan uses the same rules SonarCloud enforces on PRs.
echo "Importing SonarCloud quality profiles..."
if [[ -x "$(dirname "${BASH_SOURCE[0]}")/sonar-import-profiles.sh" ]]; then
    SONAR_URL="${SONAR_URL}" SONAR_AUTH="${SONAR_CREDS}" PROJECT_KEY="${PROJECT_KEY}" \
        "$(dirname "${BASH_SOURCE[0]}")/sonar-import-profiles.sh" || true
else
    echo "  WARN: sonar-import-profiles.sh not found, skipping profile import."
fi

TOKEN_NAME="ci-$(date +%s)"
TOKEN=$(curl -sf -u "${SONAR_CREDS}" -X POST \
    "${SONAR_URL}/api/user_tokens/generate?name=${TOKEN_NAME}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

if [[ -z "${TOKEN}" ]]; then
    echo "ERROR: Failed to generate SonarQube token." >&2
    exit 1
fi

echo "Running Vitest with coverage..."
# The project's sonar-project.properties references both
# coverage-playwright/lcov.info and coverage-vitest/lcov.info; we run only
# Vitest here (Playwright CT is heavier and is exercised in CI). Sonar
# silently ignores missing report paths, so the partial coverage is fine
# for a local smoke check.
npm run test:vitest:cov

if [[ ! -f coverage-vitest/lcov.info && ! -f coverage/lcov.info ]]; then
    echo "ERROR: Vitest produced no lcov report at the expected paths." >&2
    exit 1
fi

# Vitest's @vitest/coverage-v8 default output is coverage/lcov.info.
# Some versions / configs write to coverage-vitest/lcov.info instead. Mirror
# whatever exists so sonar-project.properties' reportPaths resolve.
if [[ -f coverage/lcov.info && ! -f coverage-vitest/lcov.info ]]; then
    mkdir -p coverage-vitest
    cp coverage/lcov.info coverage-vitest/lcov.info
fi

echo "Running sonar-scanner against ${SONAR_URL}..."
SONAR_LOG=$(mktemp)
docker run --rm \
    --network=host \
    -e SONAR_HOST_URL="${SONAR_URL}" \
    -e SONAR_TOKEN="${TOKEN}" \
    -v "$(pwd):/usr/src" \
    sonarsource/sonar-scanner-cli:latest \
    -Dsonar.projectKey="${PROJECT_KEY}" \
    | tee "${SONAR_LOG}"

# The scanner emits "More about the report processing at <SONAR_URL>/api/ce/task?id=<UUID>".
# Capture the task ID and poll the Compute Engine until it reports SUCCESS — the server
# only populates measures + quality-gate state after the CE task finishes.
TASK_ID=$(grep -oE "api/ce/task\?id=[a-f0-9-]+" "${SONAR_LOG}" | head -1 | sed 's/.*id=//')
rm -f "${SONAR_LOG}"

echo ""
echo "=== SonarQube Results ==="
echo "Dashboard: ${SONAR_URL}/dashboard?id=${PROJECT_KEY}"

if [[ -n "${TASK_ID:-}" ]]; then
    echo ""
    echo "Waiting for analysis report processing (task ${TASK_ID}, up to 2 minutes)..."
    for i in $(seq 1 60); do
        TASK_STATUS=$(curl -s -u "${SONAR_CREDS}" \
            "${SONAR_URL}/api/ce/task?id=${TASK_ID}" 2>/dev/null \
            | python3 -c "import sys,json; print(json.load(sys.stdin).get('task', {}).get('status', ''))" 2>/dev/null || true)
        if [[ "${TASK_STATUS}" == "SUCCESS" ]]; then
            echo "Analysis report processed."
            break
        fi
        if [[ "${TASK_STATUS}" == "FAILED" || "${TASK_STATUS}" == "CANCELED" ]]; then
            echo "ERROR: Sonar analysis task ${TASK_STATUS}." >&2
            exit 1
        fi
        sleep 2
    done
fi

PROBE=$(curl -s -u "${SONAR_CREDS}" \
    "${SONAR_URL}/api/qualitygates/project_status?projectKey=${PROJECT_KEY}" 2>/dev/null || true)

# Determine the set of files changed against the upstream base branch (main).
# We filter the issues report to those files only — ephemeral SonarQube has no
# previous analysis to use as a "new code" baseline, so we approximate
# PR-style focus by intersecting with the git diff.
BASE_BRANCH="${BASE_BRANCH:-main}"
CHANGED=$(git diff --name-only "${BASE_BRANCH}...HEAD" 2>/dev/null || true)
if [[ -z "${CHANGED}" ]]; then
    echo ""
    echo "(No changes vs ${BASE_BRANCH}; reporting full project for first-run baseline.)"
    SCOPE_DESC="all project files"
else
    echo ""
    echo "Files changed vs ${BASE_BRANCH}:"
    echo "${CHANGED}" | sed 's/^/  /'
    SCOPE_DESC="changed files only"
fi

echo ""
echo "================================================================================"
echo "EPHEMERAL SONARQUBE — LIMITATION"
echo "================================================================================"
echo "  This run uses a freshly-started SonarQube container with no previous"
echo "  analysis to act as a 'new code' baseline. The Quality Gate evaluates"
echo "  trivially OK and does NOT match SonarCloud, where a real baseline exists."
echo "  Treat this as a smoke check; SonarCloud on the actual PR is authoritative."
echo "================================================================================"

echo ""
echo "Quality Gate (whole project; new-code conditions trivially OK without baseline):"
echo "${PROBE}" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)['projectStatus']
    print(f'  Status: {d[\"status\"]}')
    for c in d.get('conditions', []):
        print(f'  {c[\"metricKey\"]}: {c[\"actualValue\"]} (threshold: {c[\"errorThreshold\"]}) - {c[\"status\"]}')
except Exception as e:
    print(f'  WARN: Quality gate not yet available ({e}). See dashboard.')
"

echo ""
echo "Coverage + duplications summary:"
curl -s -u "${SONAR_CREDS}" \
    "${SONAR_URL}/api/measures/component?component=${PROJECT_KEY}&metricKeys=coverage,line_coverage,branch_coverage,duplicated_lines_density,ncloc,bugs,vulnerabilities,code_smells,security_hotspots" \
    | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    measures = {m['metric']: m['value'] for m in d.get('component', {}).get('measures', [])}
    order = ['coverage', 'line_coverage', 'branch_coverage', 'duplicated_lines_density', 'ncloc', 'bugs', 'vulnerabilities', 'code_smells', 'security_hotspots']
    for k in order:
        if k in measures:
            print(f'  {k}: {measures[k]}')
except Exception as e:
    print(f'  WARN: Measures not available ({e}).')
"

echo ""
echo "Issues — ${SCOPE_DESC} (filtered to git diff vs ${BASE_BRANCH}; not a full project view):"
curl -s -u "${SONAR_CREDS}" \
    "${SONAR_URL}/api/issues/search?projectKeys=${PROJECT_KEY}&statuses=OPEN&ps=500" \
    | CHANGED_LIST="${CHANGED}" python3 -c "
import sys, json, os
changed = [f.strip() for f in os.environ.get('CHANGED_LIST', '').splitlines() if f.strip()]
try:
    d = json.load(sys.stdin)
    issues = d.get('issues', [])
    if changed:
        # Keep only issues whose component path ends with one of the changed files
        issues = [i for i in issues if any(i.get('component', '').endswith(f) for f in changed)]
    print(f'  Total in scope: {len(issues)}')
    for i in issues[:50]:
        comp = i['component'].split(':')[-1]
        line = i.get('line', '?')
        print(f'  [{i[\"severity\"]}] {comp}:{line} - {i[\"message\"]}')
except Exception as e:
    print(f'  WARN: Issues list not available ({e}).')
"

echo ""
echo "Done. (Set BASE_BRANCH=<other> to compare against a different base; default: main.)"
