# Sonar Quality Profiles

XML backups of the SonarCloud quality profiles enforced on PRs of this project.
Checked into the repo so anyone can run a local SonarQube (or AI tooling that
talks to SonarQube's API) with the **same rules SonarCloud uses**, without
needing access to SonarCloud or the org token.

| File      | Language   | Profile name on SonarCloud | Rules in CE | Notes                                  |
| --------- | ---------- | -------------------------- | ----------- | -------------------------------------- |
| `ts.xml`  | TypeScript | `Custom`                   | 390 / 434   | The project's customised TS profile    |
| `js.xml`  | JavaScript | `Sonar way`                | 378 / 422   | Imported as `Sonar way (cloud)`        |
| `css.xml` | CSS        | `Sonar way`                | 27 / 27     | Imported as `Sonar way (cloud)`        |
| `web.xml` | HTML       | `Sonar way`                | 53 / 53     | Imported as `Sonar way (cloud)`        |
| `json.xml`| JSON       | `Sonar way`                | 0 / 2       | Both rules require commercial editions |

The "skipped" rules are commercial-tier rules that SonarQube Community Edition
does not ship with (mostly the secret-detection family). They are silently
ignored on import and reported as `ruleFailures` in the API response.

## Importing into a local SonarQube

Run the helper script from the repo root once your local SonarQube is up:

```bash
./scripts/sonar-import-profiles.sh
```

Defaults match the local-SonarQube setup documented in
`scripts/sonar-local.sh`. Override per-environment with env vars:

```bash
SONAR_URL=http://localhost:9000 \
SONAR_AUTH=admin:AdminLocal2024! \
PROJECT_KEY=czertainly-fe-administrator \
./scripts/sonar-import-profiles.sh
```

Built-in `Sonar way` profiles cannot be overwritten in place, so the JS/CSS/
HTML/JSON imports are renamed to `Sonar way (cloud)` on the fly. The TS profile
is named `Custom` on SonarCloud and imports under that name unchanged.

## Refreshing the backups from SonarCloud

When the cloud profile changes, regenerate the XMLs and commit:

```bash
./scripts/sonar-export-profiles.sh
```

(No SonarCloud token needed if the org/project is public; otherwise pass
`SC_TOKEN=<token>` to the script.)
