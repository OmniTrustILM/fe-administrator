#!/usr/bin/env bash
# Refresh sonar/profiles/*.xml from SonarCloud. Run this whenever the cloud
# profile is updated and commit the resulting diff.
#
# Usage:
#   ./scripts/sonar-export-profiles.sh
#   SC_TOKEN=<sonarcloud-token> ./scripts/sonar-export-profiles.sh
#
# The org/project keys are read from sonar-project.properties at the repo root.
# A token is only needed if the SonarCloud org/project is private.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
props="${repo_root}/sonar-project.properties"
profiles_dir="${repo_root}/sonar/profiles"

if [[ ! -f "${props}" ]]; then
    echo "ERROR: ${props} not found." >&2
    exit 1
fi

org="$(awk -F= '/^sonar.organization=/ {print $2}' "${props}" | tr -d '[:space:]')"
project="$(awk -F= '/^sonar.projectKey=/ {print $2}' "${props}" | tr -d '[:space:]')"

if [[ -z "${org}" || -z "${project}" ]]; then
    echo "ERROR: Could not determine sonar.organization / sonar.projectKey from ${props}." >&2
    exit 1
fi

mkdir -p "${profiles_dir}"

echo "Looking up active profiles for ${org}/${project}..."
if [[ -n "${SC_TOKEN:-}" ]]; then
    profiles_json="$(curl -sf -u "${SC_TOKEN}:" "https://sonarcloud.io/api/qualityprofiles/search?organization=${org}&project=${project}")"
else
    profiles_json="$(curl -sf "https://sonarcloud.io/api/qualityprofiles/search?organization=${org}&project=${project}")"
fi

python3 - <<'PY' "${profiles_json}" "${org}" "${profiles_dir}" "${SC_TOKEN:-}"
import json, os, subprocess, sys, urllib.parse
profiles_json, org, profiles_dir, token = sys.argv[1:]
data = json.loads(profiles_json)
languages = {'ts','js','css','web','json'}
for p in data.get('profiles', []):
    lang = p.get('language')
    if lang not in languages:
        continue
    name = p['name']
    out = os.path.join(profiles_dir, f"{lang}.xml")
    qs = urllib.parse.urlencode({
        'organization': org,
        'qualityProfile': name,
        'language': lang,
    })
    cmd = ['curl', '-sf']
    if token:
        cmd += ['-u', f'{token}:']
    cmd += ['-o', out, f'https://sonarcloud.io/api/qualityprofiles/backup?{qs}']
    print(f"==> {lang} ({name}) -> {out}")
    subprocess.run(cmd, check=True)
PY

echo
echo "Done. Review the diff in ${profiles_dir} and commit."
