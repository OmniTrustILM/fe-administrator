import type { SearchFieldListModel } from 'types/certificate';
import { FilterFieldType, PlatformEnum, type SearchFieldDataDto } from 'types/openapi';

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
