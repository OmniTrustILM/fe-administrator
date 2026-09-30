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
    valueSchema?: string;
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
        // The ASN.1 module is sent as entered: Core is its only reader, and a blank one means none.
        const valueSchema =
            values.valueEncoding === ExtensionValueEncoding.Der && values.valueSchema?.trim() ? values.valueSchema : undefined;
        return {
            defaultCritical: values.defaultCritical ?? false,
            valueEncoding: values.valueEncoding,
            valueSchema,
        };
    }
    return undefined;
};

/** How Core begins every refusal of an extension's ASN.1 module. */
const VALUE_SCHEMA_ERROR_PREFIX = "The extension's ASN.1 module";

/**
 * The message of a 422 in which Core refused the ASN.1 module sent as `valueSchema`, so the form can
 * show it on that field; undefined for any other failure, which keeps the generic error alert.
 */
export const extractValueSchemaError = (err: unknown): string | undefined => {
    const { status, response } = (err ?? {}) as { status?: unknown; response?: unknown };
    if (status !== 422 || !Array.isArray(response) || response.length === 0) return undefined;
    const isModuleError = (message: unknown) => typeof message === 'string' && message.startsWith(VALUE_SCHEMA_ERROR_PREFIX);
    return response.every(isModuleError) ? response.join(' ') : undefined;
};

export const isCertificateExtensionProperties = (
    props?: CustomOidEntryDetailResponseDtoAdditionalProperties,
): props is CertificateExtensionOidPropertiesDto => !!props && 'valueEncoding' in props;

export const isRdnProperties = (props?: CustomOidEntryDetailResponseDtoAdditionalProperties): props is RdnAttributeTypeOidPropertiesDto =>
    !!props && 'code' in props;

// `SN` is Surname (RFC 4519, OpenSSL, BouncyCastle) while `SERIALNUMBER` is the subject serial
// number. The two sit adjacent in the RDN dropdown and a mispick is a structurally valid mapping no
// backend validation can reject — it silently writes the wrong RDN into every issued certificate.
const RDN_CODE_CLARIFICATIONS: Record<string, string> = {
    SN: 'Surname (family name). Not a serial number — use SERIALNUMBER for that.',
    SERIALNUMBER: "Subject serial number, e.g. a device serial. Not the certificate's serial number, and not SN (surname).",
};

export const rdnCodeClarification = (code?: string): string | undefined =>
    code ? RDN_CODE_CLARIFICATIONS[code.trim().toUpperCase()] : undefined;

/** `value` = dotted OID, `label` = human display, `aliases`/`code` = the RDN codes the value may legacy-match. */
export type OidSelectOption = { value: string; label: string; description?: string; aliases?: string[]; code?: string };

export const toOidSelectOptions = (entries: OIDResponseModel[]): OidSelectOption[] =>
    entries.map((e) => {
        // RDN entries carry a code (+altCodes); a legacy mapping may store one of those instead of the
        // dotted OID, so expose them as aliases the dropdown can reconcile back to this option.
        const code = isRdnProperties(e.additionalProperties) ? e.additionalProperties.code : undefined;
        const aliases = isRdnProperties(e.additionalProperties)
            ? [e.additionalProperties.code, ...(e.additionalProperties.altCodes ?? [])].filter(Boolean)
            : undefined;
        const name = e.displayName?.trim() || e.oid;
        return {
            value: e.oid,
            label: code ? `${name} (${code})` : name,
            description: rdnCodeClarification(code) ?? e.description,
            aliases,
            code,
        };
    });

// System and custom entries are disjoint by construction — the backend rejects a custom OID that
// shadows a system one — so the lists concatenate without a dedupe pass.
export const toMergedOidSelectOptions = (system?: OIDResponseModel[], custom?: OIDResponseModel[]): OidSelectOption[] =>
    toOidSelectOptions([...(system ?? []), ...(custom ?? [])]);

export const buildRdnCodeByOid = (entries: OIDResponseModel[]): Record<string, string> => {
    const map: Record<string, string> = {};
    for (const e of entries) {
        if (isRdnProperties(e.additionalProperties) && e.additionalProperties.code) {
            map[e.oid] = e.additionalProperties.code;
        }
    }
    return map;
};
