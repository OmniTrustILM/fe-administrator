import type { SearchFieldListModel, SearchFilterModel } from 'types/certificate';
import { FilterConditionOperator, FilterFieldSource, FilterFieldType, PlatformEnum, type SearchFieldDataDto } from 'types/openapi';

export type SigningRecordFilterKind = 'profile' | 'requester' | 'workflowType' | 'protocol' | 'scheme' | 'signingTime';

function flatten(availableFilters: SearchFieldListModel[]): SearchFieldDataDto[] {
    return availableFilters.flatMap((group) => group.searchFieldData ?? []);
}

function haystack(field: SearchFieldDataDto): string {
    return `${field.fieldIdentifier} ${field.fieldLabel}`.toLowerCase();
}

export function resolveSigningRecordFilterField(
    availableFilters: SearchFieldListModel[],
    kind: SigningRecordFilterKind,
): SearchFieldDataDto | undefined {
    const fields = flatten(availableFilters);

    switch (kind) {
        case 'workflowType':
            return fields.find((f) => f.platformEnum === PlatformEnum.SigningWorkflowType);
        case 'protocol':
            return fields.find((f) => f.platformEnum === PlatformEnum.SigningProtocol);
        case 'scheme':
            return (
                fields.find((f) => f.platformEnum === PlatformEnum.SigningScheme) ??
                fields.find((f) => f.platformEnum === PlatformEnum.ManagedSigningType)
            );
        case 'signingTime':
            return fields.find(
                (f) =>
                    (f.type === FilterFieldType.Date || f.type === FilterFieldType.Datetime) &&
                    haystack(f).includes('signing') &&
                    haystack(f).includes('time'),
            );
        case 'profile':
            return fields.find((f) => haystack(f).includes('profile'));
        case 'requester':
            return fields.find((f) => haystack(f).includes('request') || haystack(f).includes('user'));
        default:
            return undefined;
    }
}

export const SIGNING_WINDOW_HOURS = { last24h: 24, last7d: 24 * 7 } as const;

export function buildSigningTimeWindowFilter(
    availableFilters: SearchFieldListModel[],
    hours: number,
    now: Date = new Date(),
): SearchFilterModel[] {
    const field = resolveSigningRecordFilterField(availableFilters, 'signingTime');
    if (!field) return [];

    // Closed on both ends, like the time-series drill-down: the tile counts a window, so a
    // future-dated signing time must not slip into the list the tile opens.
    return [
        {
            fieldSource: FilterFieldSource.Property,
            condition: FilterConditionOperator.GreaterOrEqual,
            fieldIdentifier: field.fieldIdentifier,
            value: new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString(),
        },
        {
            fieldSource: FilterFieldSource.Property,
            condition: FilterConditionOperator.LesserOrEqual,
            fieldIdentifier: field.fieldIdentifier,
            value: now.toISOString(),
        },
    ];
}
