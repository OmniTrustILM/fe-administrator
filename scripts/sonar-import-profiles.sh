#!/usr/bin/env bash
# Import the SonarCloud quality profiles checked into sonar/profiles/ into a
# local SonarQube Community instance, and bind them to the project key used by
# this repo. Run this any time you want a fresh local container to have the
# same rules SonarCloud enforces on PRs.
#
# Usage:
#   ./scripts/sonar-import-profiles.sh                       # defaults
#   SONAR_URL=http://localhost:9000 \
#     SONAR_AUTH=admin:AdminLocal2024! \
#     PROJECT_KEY=czertainly-fe-administrator \
#     ./scripts/sonar-import-profiles.sh
#
# Requirements:
#   - SonarQube already running and reachable at SONAR_URL
#   - curl, sed, and python3 on PATH
#
# Built-in "Sonar way" profiles cannot be overwritten in place, so the JS, CSS,
# HTML, and JSON profiles are renamed to "Sonar way (cloud)" on the fly before
# being restored. The TypeScript profile is named "Custom" on SonarCloud and is
# imported under that name as-is.
set -euo pipefail

SONAR_URL="${SONAR_URL:-http://localhost:9000}"
SONAR_AUTH="${SONAR_AUTH:-admin:AdminLocal2024!}"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
profiles_dir="${repo_root}/sonar/profiles"

# Default project key from sonar-project.properties unless caller overrode it.
if [[ -z "${PROJECT_KEY:-}" ]]; then
    PROJECT_KEY="$(awk -F= '/^sonar.projectKey=/ {print $2}' "${repo_root}/sonar-project.properties" 2>/dev/null | tr -d '[:space:]')"
fi
PROJECT_KEY="${PROJECT_KEY:-fe-administrator}"

if [[ ! -d "${profiles_dir}" ]]; then
    echo "ERROR: ${profiles_dir} not found." >&2
    exit 1
fi

for tool in curl sed python3; do
    if ! command -v "${tool}" >/dev/null 2>&1; then
        echo "ERROR: ${tool} not on PATH." >&2
        exit 1
    fi
done

if ! curl -sf -u "${SONAR_AUTH}" "${SONAR_URL}/api/system/status" >/dev/null; then
    echo "ERROR: SonarQube not reachable at ${SONAR_URL} with the supplied credentials." >&2
    exit 1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

# language : profile-name-on-cloud : profile-name-to-use-locally
declare -a entries=(
    "ts:Custom:Custom"
    "js:Sonar way:Sonar way (cloud)"
    "css:Sonar way:Sonar way (cloud)"
    "web:Sonar way:Sonar way (cloud)"
    "json:Sonar way:Sonar way (cloud)"
)

for entry in "${entries[@]}"; do
    IFS=':' read -r lang cloud_name local_name <<<"${entry}"
    src_xml="${profiles_dir}/${lang}.xml"
    if [[ ! -f "${src_xml}" ]]; then
        echo "WARN: ${src_xml} missing, skipping ${lang}." >&2
        continue
    fi

    staged_xml="${tmp_dir}/${lang}.xml"
    if [[ "${cloud_name}" == "${local_name}" ]]; then
        cp "${src_xml}" "${staged_xml}"
    else
        sed "s|<name>${cloud_name}</name>|<name>${local_name}</name>|" "${src_xml}" >"${staged_xml}"
    fi

    echo "==> Restoring ${lang} as '${local_name}'"
    response="$(curl -s -u "${SONAR_AUTH}" -F "backup=@${staged_xml}" "${SONAR_URL}/api/qualityprofiles/restore")"
    echo "${response}" | python3 -c "
import json, sys
try:
    d = json.loads(sys.stdin.read())
except Exception:
    print('  (non-JSON response)')
    raise SystemExit(0)
if 'errors' in d:
    for e in d['errors']:
        print(f\"  ERROR: {e.get('msg')}\")
    raise SystemExit(1)
profile = d.get('profile', {})
print(f\"  ok: name='{profile.get('name')}' rules={d.get('ruleSuccesses')} skipped={d.get('ruleFailures')}\")
"

    echo "==> Associating ${lang} '${local_name}' with project ${PROJECT_KEY}"
    code="$(curl -s -o /dev/null -w '%{http_code}' -u "${SONAR_AUTH}" -X POST \
        --data-urlencode "project=${PROJECT_KEY}" \
        --data-urlencode "qualityProfile=${local_name}" \
        --data-urlencode "language=${lang}" \
        "${SONAR_URL}/api/qualityprofiles/add_project")"
    if [[ "${code}" != "204" ]]; then
        echo "  WARN: add_project returned HTTP ${code} (project may not exist yet; create it first or rerun after the first scan)." >&2
    fi
done

echo
echo "Imported profiles for project '${PROJECT_KEY}':"
curl -s -u "${SONAR_AUTH}" "${SONAR_URL}/api/qualityprofiles/search?project=${PROJECT_KEY}" \
    | python3 -c "
import json, sys
d = json.load(sys.stdin)
for p in d.get('profiles', []):
    if p.get('language') in ('ts','js','css','web','json'):
        print(f\"  {p['language']:5} | {p['name']:24} | rules={p['activeRuleCount']}\")
"
