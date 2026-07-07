import type { DataAttributeV3, FieldMapping, MappedField } from 'types/openapi';
import { FieldType } from 'types/openapi';
import type { AttributeDescriptorModel, CustomAttributeModel, DataAttributeModel } from 'types/attributes';
import { isDataAttributeModel } from 'types/attributes';

type AnyDescriptor = AttributeDescriptorModel | DataAttributeModel | CustomAttributeModel | undefined;

// Friendly X.509 SAN names keyed by GeneralNameType value. Best-effort: any value not
// present here falls back to its raw string, so new backend enum members still render.
const GENERAL_NAME_LABELS: Record<string, string> = {
    dns: 'dNSName',
    email: 'rfc822Name',
    ip: 'iPAddress',
    uri: 'uniformResourceIdentifier',
    directoryName: 'directoryName',
    registeredId: 'registeredID',
    otherName: 'otherName',
};

/** Extracts fieldMapping defensively; only DataAttribute (V3) carries it. */
export function getFieldMapping(descriptor: AnyDescriptor): FieldMapping | undefined {
    if (!descriptor || !isDataAttributeModel(descriptor as AttributeDescriptorModel)) return undefined;
    return (descriptor as DataAttributeV3).fieldMapping ?? undefined;
}

function generalNameLabel(value: string): string {
    return GENERAL_NAME_LABELS[value] ?? value;
}

function fieldToken(field: MappedField): string {
    switch (field?.fieldType) {
        case FieldType.Rdn: {
            const rdn = (field as { rdn?: string }).rdn;
            return rdn ? `Subject ${rdn}` : 'Subject';
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

/** Human summary of where the value lands, e.g. "Subject CN + SAN dNSName". */
export function fieldMappingSummary(fieldMapping: FieldMapping | undefined): string {
    const fields = fieldMapping?.fields;
    if (!Array.isArray(fields) || fields.length === 0) return '';
    return [...fields]
        .sort((a, b) => ((a as MappedField)?.order ?? Number.MAX_SAFE_INTEGER) - ((b as MappedField)?.order ?? Number.MAX_SAFE_INTEGER))
        .map((field) => fieldToken(field as MappedField))
        .filter((token) => token.length > 0)
        .join(' + ');
}
