import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Widget from 'components/Widget';
import { getEnumDescription, getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { type AcmeIdentifierAuthorizationMode, type AcmePreauthorizedIdentifierDto, PlatformEnum } from 'types/openapi';
import { effectiveMode, IDENTIFIER_TYPE_LABELS, MODE_DESCRIPTIONS, normalizeEntry } from 'utils/acme-identifier-policy';

type Props = Readonly<{
    identifiers: AcmePreauthorizedIdentifierDto[];
    mode?: AcmeIdentifierAuthorizationMode;
}>;

const headers: TableHeader[] = [
    { id: 'value', content: 'Identifier' },
    { id: 'type', content: 'Type' },
    { id: 'match', content: 'Match' },
    { id: 'wildcard', content: 'Wildcard' },
];

export default function PreauthorizedIdentifiersWidget({ identifiers, mode }: Props) {
    const modeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.AcmeIdentifierAuthorizationMode));
    const matchEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.AcmeIdentifierMatchType));
    const current = effectiveMode(mode);

    const rows: TableDataRow[] = useMemo(
        () =>
            // Shown as core acts on it, which is also how the edit form seeds it.
            identifiers.map(normalizeEntry).map((entry, position) => ({
                // Entries carry no id of their own and may repeat, so the position keeps the row id unique.
                id: `${position}:${entry.type}:${entry.value}:${entry.matchType}:${!!entry.allowWildcard}`,
                columns: [
                    <code key="value" className="font-mono text-sm">
                        {entry.value}
                    </code>,
                    IDENTIFIER_TYPE_LABELS[entry.type],
                    getEnumLabel(matchEnum, entry.matchType),
                    entry.allowWildcard ? 'Yes' : 'No',
                ],
            })),
        [identifiers, matchEnum],
    );

    return (
        <Widget title="Pre-authorized identifiers" titleSize="large">
            <p className="mb-3 text-sm text-content" data-testid="identifier-policy-mode">
                <span className="font-medium">{getEnumLabel(modeEnum, current)}:</span>{' '}
                {getEnumDescription(modeEnum, current) ?? MODE_DESCRIPTIONS[current]}
            </p>
            {identifiers.length > 0 ? (
                <CustomTable headers={headers} data={rows} />
            ) : (
                <p className="text-sm text-content-subtle" data-testid="identifier-policy-empty">
                    No identifiers are pre-authorized.
                </p>
            )}
        </Widget>
    );
}
