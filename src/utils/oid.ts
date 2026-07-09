import {
    OidCategory,
    ExtensionValueEncoding,
    type CustomOidEntryUpdateRequestDtoAdditionalProperties,
    type CustomOidEntryDetailResponseDtoAdditionalProperties,
    type CertificateExtensionOidPropertiesDto,
    type RdnAttributeTypeOidPropertiesDto,
} from 'types/openapi';

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
