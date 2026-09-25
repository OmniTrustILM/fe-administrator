import Badge from 'components/Badge';
import CopyUrlCell from 'components/CopyUrlCell';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Widget from 'components/Widget';
import { useMemo } from 'react';
import { Link } from 'react-router';
import type { SecretDto } from 'types/openapi';

type Props = Readonly<{
    secretUuids: string[];
    secrets: SecretDto[];
    isLoading: boolean;
    listError?: string;
    onGenerateKey: () => void;
}>;

const headers: TableHeader[] = [
    { id: 'secret', content: 'Secret' },
    { id: 'kid', content: 'Key identifier (kid)' },
];

function unresolvedLabel(isLoading: boolean, listError: string | undefined): string {
    if (isLoading) return 'Loading…';
    return listError ? 'Secrets could not be listed' : 'Not available to you';
}

function secretCell(uuid: string, secret: SecretDto | undefined, isLoading: boolean, listError: string | undefined) {
    if (secret) {
        return (
            <Link key="secret" to={`../../secrets/detail/${uuid}`}>
                {secret.name}
            </Link>
        );
    }
    return (
        <span key="secret" className="text-content-subtle">
            {unresolvedLabel(isLoading, listError)}
        </span>
    );
}

export default function EabSecretsWidget({ secretUuids, secrets, isLoading, listError, onGenerateKey }: Props) {
    const required = secretUuids.length > 0;

    const rows: TableDataRow[] = useMemo(
        () =>
            secretUuids.map((uuid) => ({
                id: uuid,
                columns: [
                    secretCell(
                        uuid,
                        secrets.find((candidate) => candidate.uuid === uuid),
                        isLoading,
                        listError,
                    ),
                    <CopyUrlCell key="kid" label="kid">
                        {uuid}
                    </CopyUrlCell>,
                ],
            })),
        [secretUuids, secrets, isLoading, listError],
    );

    return (
        <Widget
            title="External Account Binding"
            titleSize="large"
            widgetButtons={[
                {
                    icon: 'key',
                    'aria-label': 'Generate key',
                    tooltip: 'Generate a key to store in a secret',
                    disabled: false,
                    onClick: onGenerateKey,
                },
            ]}
        >
            <p className="mb-3 text-sm text-content" data-testid="eab-status">
                {required ? (
                    <>
                        <Badge color="warning">Required</Badge> New accounts must bind with a key stored in one of the secrets below.
                    </>
                ) : (
                    <>
                        <Badge color="secondary">Not required</Badge> Any ACME client may register an account. Add a secret to require it.
                    </>
                )}
            </p>
            {required && listError ? (
                <p className="mb-2 text-sm text-danger" role="alert" data-testid="eab-list-error">
                    {listError}
                </p>
            ) : null}
            {required ? <CustomTable headers={headers} data={rows} /> : null}
        </Widget>
    );
}
