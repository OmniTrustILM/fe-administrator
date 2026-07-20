import type { DataAttributeV3, FieldMapping, MappedField } from 'types/openapi';
import { FieldType, GeneralNameType } from 'types/openapi';
import type { AttributeDescriptorModel } from 'types/attributes';
import { isDataAttributeModel } from 'types/attributes';

type AnyDescriptor = AttributeDescriptorModel | undefined;

// Friendly X.509 SAN names keyed by GeneralNameType. Typing the map by the enum makes a
// future enum change a compile error here; the raw-value fallback in generalNameLabel keeps
// forward-compatibility for values not (yet) in the generated enum.
const GENERAL_NAME_LABELS: Record<GeneralNameType, string> = {
    [GeneralNameType.Dns]: 'dNSName',
    [GeneralNameType.Email]: 'rfc822Name',
    [GeneralNameType.Ip]: 'iPAddress',
    [GeneralNameType.Uri]: 'uniformResourceIdentifier',
    [GeneralNameType.DirectoryName]: 'directoryName',
    [GeneralNameType.RegisteredId]: 'registeredID',
    [GeneralNameType.OtherName]: 'otherName',
};

// Group order for tokens; `order` on MappedField is scoped per field type, so we group by
// type first and only sort by `order` within a group (never across types).
const FIELD_TYPE_ORDER: FieldType[] = [FieldType.Rdn, FieldType.San, FieldType.Extension];

/** Extracts fieldMapping defensively; only DataAttribute (V3) carries it. */
export function getFieldMapping(descriptor: AnyDescriptor): FieldMapping | undefined {
    if (!descriptor || !isDataAttributeModel(descriptor as AttributeDescriptorModel)) return undefined;
    return (descriptor as DataAttributeV3).fieldMapping ?? undefined;
}

function generalNameLabel(value: string): string {
    return GENERAL_NAME_LABELS[value as GeneralNameType] ?? value;
}

function fieldToken(field: MappedField, rdnCodeByOid: Record<string, string> = {}): string {
    switch (field?.fieldType) {
        case FieldType.Rdn: {
            const rdn = (field as { rdn?: string }).rdn;
            const code = rdn ? (rdnCodeByOid[rdn] ?? rdn) : undefined;
            return code ? `Subject ${code}` : 'Subject';
        }
        case FieldType.San: {
            const generalNameType = (field as { generalNameType?: string }).generalNameType;
            return generalNameType ? `SAN ${generalNameLabel(generalNameType)}` : 'SAN';
        }
        case FieldType.Extension: {
            const extensionOid = (field as { extensionOid?: string }).extensionOid;
            return extensionOid ? `Extension ${extensionOid}` : 'Extension';
        }
        default:
            return field?.fieldType ? String(field.fieldType) : '';
    }
}

function typeRank(field: MappedField): number {
    const index = FIELD_TYPE_ORDER.indexOf(field?.fieldType);
    return index === -1 ? FIELD_TYPE_ORDER.length : index;
}

/**
 * Tokens describing where the value lands, e.g. ["Subject CN", "SAN dNSName"]. Fields are
 * grouped by type (RDN → SAN → Extension) and only sorted by `order` within each group,
 * because `order` is a per-type index. This is the single source both the badge summary and
 * its tooltip build on, so their delimiters can never drift apart.
 */
export function fieldMappingTokens(fieldMapping: FieldMapping | undefined, rdnCodeByOid: Record<string, string> = {}): string[] {
    const fields = fieldMapping?.fields;
    if (!Array.isArray(fields) || fields.length === 0) return [];
    return [...(fields as MappedField[])]
        .sort((a, b) => {
            const byType = typeRank(a) - typeRank(b);
            if (byType !== 0) return byType;
            return (a?.order ?? Number.MAX_SAFE_INTEGER) - (b?.order ?? Number.MAX_SAFE_INTEGER);
        })
        .map((field) => fieldToken(field, rdnCodeByOid))
        .filter((token) => token.length > 0);
}

/** Human summary of where the value lands, e.g. "Subject CN + SAN dNSName". */
export function fieldMappingSummary(fieldMapping: FieldMapping | undefined, rdnCodeByOid: Record<string, string> = {}): string {
    return fieldMappingTokens(fieldMapping, rdnCodeByOid).join(' + ');
}
