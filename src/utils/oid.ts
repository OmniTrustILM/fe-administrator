import {
    OidCategory,
    ExtensionValueEncoding,
    type CustomOidEntryUpdateRequestDtoAdditionalProperties,
    type CustomOidEntryDetailResponseDtoAdditionalProperties,
    type CertificateExtensionOidPropertiesDto,
    type RdnAttributeTypeOidPropertiesDto,
} from 'types/openapi';
import type { OIDResponseModel } from 'types/oids';

export const isCertificateExtensionCategory = (category?: string): boolean => category === OidCategory.CertificateExtension;

export const isRdnAttributeTypeCategory = (category?: string): boolean => category === OidCategory.RdnAttributeType;

export const getExtensionValueEncodingOptions = (): { value: ExtensionValueEncoding; label: string }[] =>
    Object.values(ExtensionValueEncoding).map((value) => ({ value, label: value }));

export const isExtensionValueEncoding = (value?: string): value is ExtensionValueEncoding =>
    !!value && (Object.values(ExtensionValueEncoding) as string[]).includes(value);

export interface OidFormValues {
    code?: string;
    alternativeCode?: string[];
    defaultCritical?: boolean;
    valueEncoding?: string;
}

export const buildOidAdditionalProperties = (
    category: string,
    values: OidFormValues,
): CustomOidEntryUpdateRequestDtoAdditionalProperties | undefined => {
    if (isRdnAttributeTypeCategory(category)) {
        return {
            code: values.code ?? '',
            altCodes: values.alternativeCode ?? undefined,
        };
    }
    if (isCertificateExtensionCategory(category)) {
        if (!isExtensionValueEncoding(values.valueEncoding)) {
            return undefined;
        }
        return {
            defaultCritical: values.defaultCritical ?? false,
            valueEncoding: values.valueEncoding,
        };
    }
    return undefined;
};

export const isCertificateExtensionProperties = (
    props?: CustomOidEntryDetailResponseDtoAdditionalProperties,
): props is CertificateExtensionOidPropertiesDto => !!props && 'valueEncoding' in props;

export const isRdnProperties = (props?: CustomOidEntryDetailResponseDtoAdditionalProperties): props is RdnAttributeTypeOidPropertiesDto =>
    !!props && 'code' in props;

export const toOidSelectOptions = (
    entries: OIDResponseModel[],
): { value: string; label: string; description?: string; aliases?: string[] }[] =>
    entries.map((e) => {
        // RDN entries carry a code (+altCodes); a legacy mapping may store one of those instead of the
        // dotted OID, so expose them as aliases the dropdown can reconcile back to this option.
        const aliases = isRdnProperties(e.additionalProperties)
            ? [e.additionalProperties.code, ...(e.additionalProperties.altCodes ?? [])].filter(Boolean)
            : undefined;
        return { value: e.oid, label: e.displayName?.trim() || e.oid, description: e.description, aliases };
    });
