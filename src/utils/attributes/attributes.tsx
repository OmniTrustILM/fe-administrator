import {
    type AttributeDescriptorModel,
    type AttributeRequestModel,
    type AttributeRequestModelV2,
    type AttributeRequestModelV3,
    type AttributeResponseModel,
    type BaseAttributeContentDtoV2,
    type BaseAttributeContentDtoV3,
    type BaseAttributeContentModel,
    type CodeBlockAttributeContentDataModel,
    type CodeBlockAttributeContentDtoV2,
    type CodeBlockAttributeContentModel,
    type CustomAttributeModel,
    type DataAttributeModel,
    isCustomAttributeModel,
    isDataAttributeModel,
} from 'types/attributes';
import type { FieldValues } from 'react-hook-form';
import {
    AttributeContentType,
    AttributeVersion,
    type FileAttributeContentData,
    ProgrammingLanguageEnum,
    type SecretAttributeContentV2,
} from 'types/openapi';
import { base64ToUtf8, utf8ToBase64 } from 'utils/common-utils';
import { getFormattedDate, getFormattedDateTime } from 'utils/dateUtil';
import CodeBlock from '../../components/Attributes/CodeBlock';
import { getDatetimeFormValue, getDateFormValue } from './attributeFormValues';

/**
 * Value carried by a react-select option produced from an attribute's content.
 * Structurally identical to the `OptionValue` accepted by the shared Select component
 * (`string | number | object`) — an option value is either a primitive scalar or a
 * full attribute content object ({ data, reference }).
 */
export type AttributeSelectOptionValue = string | number | object;

/** A react-select option produced from / consumed by attribute editing components. */
export type AttributeSelectOption = { label: string; value: AttributeSelectOptionValue; disabled?: boolean };

/**
 * Loosely-shaped attribute content produced while collecting values from the form.
 * The form stores raw user input which is normalised into this partial content shape
 * before being cast to the strict request content DTOs.
 */
export type FormAttributeContentItem = { data?: unknown; reference?: string; contentType?: AttributeContentType };

export const attributeFieldNameTransform: { [name: string]: string } = {
    name: 'Name',
    credentialProvider: 'Credential Provider',
    authorityProvider: 'Authority Provider',
    discoveryProvider: 'Discovery Provider',
    legacyAuthorityProvider: 'Legacy Authority Provider',
    complianceProvider: 'Compliance Provider',
    entityProvider: 'Entity Provider',
    cryptographyProvider: 'Cryptography Provider',
    notificationProvider: 'Notification Provider',
};
export const getAttributeCopyValue = (contentType: AttributeContentType, content: BaseAttributeContentModel[] | undefined) => {
    if (!content) return undefined;

    if (contentType === AttributeContentType.Resource) {
        return content
            .map((item) => {
                const data = (item?.data ?? {}) as { uuid?: string; name?: string; resource?: string };
                const name = data.name ?? item?.reference ?? '';
                return `${data.resource ?? ''}, ${name}, ${data.uuid ?? ''}`;
            })
            .join('\n');
    }

    const mapping = (content: BaseAttributeContentModel): string | undefined => {
        switch (contentType) {
            case AttributeContentType.Codeblock:
                if (typeof content.data === 'object' && 'code' in content.data) return base64ToUtf8(content.data.code);
                return content.data.toString();
            case AttributeContentType.Credential:
                if (typeof content.data === 'object' && 'name' in content.data) return content.data.name;
                return content.data.toString();
            case AttributeContentType.File:
                if (typeof content.data === 'object' && 'content' in content.data) return base64ToUtf8(content.data.content);
                return content.data.toString();
            case AttributeContentType.Object:
                return JSON.stringify(content.data);
            case AttributeContentType.Boolean:
                return content.data ? 'true' : 'false';
            case AttributeContentType.Time:
                return content.data.toString();
            case AttributeContentType.Date:
                return content.data.toString();
            case AttributeContentType.Datetime:
                return getFormattedDateTime(content.data.toString());
            case AttributeContentType.Float:
            case AttributeContentType.Integer:
            case AttributeContentType.String:
            case AttributeContentType.Text:
                return content.data.toString();
            case AttributeContentType.Secret:
                return undefined;
        }
    };
    return content.map(mapping).join(', ');
};

export const getAttributeContent = (contentType: AttributeContentType, content: BaseAttributeContentModel[] | undefined) => {
    if (!content) return 'Not set';

    if (contentType === AttributeContentType.Codeblock && content.length > 0) {
        return <CodeBlock content={content[0] as CodeBlockAttributeContentModel} />;
    }

    const mapping = (content: BaseAttributeContentModel): string | undefined => {
        switch (contentType) {
            case AttributeContentType.Boolean:
                return content.data ? 'true' : 'false';
            case AttributeContentType.Credential:
            case AttributeContentType.Object:
            case AttributeContentType.File:
                return content.reference;
            case AttributeContentType.Resource: {
                const data = content.data as { uuid?: string; name?: string } | undefined;
                return content.reference ?? data?.name ?? data?.uuid;
            }
            case AttributeContentType.Time:
                return String(content.data);
            case AttributeContentType.Date:
                return String(content.data);
            case AttributeContentType.Datetime:
                return getFormattedDateTime(String(content.data));
            case AttributeContentType.Float:
            case AttributeContentType.Integer:
            case AttributeContentType.String:
            case AttributeContentType.Text:
                return String(content.data);
            case AttributeContentType.Secret:
                return '*****';
        }
        return undefined;
    };

    const isFileAttributeContentData = (data: unknown): data is FileAttributeContentData => {
        return typeof data === 'object' && data !== null && 'fileName' in data && 'mimeType' in data;
    };

    const checkFileNameAndMimeType = (content: BaseAttributeContentModel): string | undefined => {
        if (isFileAttributeContentData(content.data)) {
            return `${content.data.fileName} (${content.data.mimeType})`;
        } else {
            return 'Unknown data type';
        }
    };

    return content.map((content) => mapping(content) ?? checkFileNameAndMimeType(content) ?? '').join(', ');
};

/**
 * A RESOURCE selection must serialise as a secret-free { resource, uuid, name } reference — never
 * the raw option object, which may carry expanded content Core resolved for display. Empty picker
 * stubs keep their empty data so stripEmptyResourceContent can drop them.
 */
const getResourceFormValue = (item: unknown): FormAttributeContentItem => {
    const source = item && typeof item === 'object' && 'value' in item ? (item as { value?: unknown }).value : item;
    if (source && typeof source === 'object' && ('data' in source || 'reference' in source)) {
        const src = source as { data?: unknown; reference?: unknown };
        const rawData = src.data;
        const data =
            rawData && typeof rawData === 'object'
                ? {
                      resource: (rawData as { resource?: unknown }).resource,
                      uuid: (rawData as { uuid?: unknown }).uuid,
                      name: (rawData as { name?: unknown }).name,
                  }
                : rawData;
        const reference = src.reference;
        return reference != null && reference !== '' ? { data, reference: reference as string } : { data };
    }
    if (source && typeof source === 'object') {
        const { resource, uuid, name } = source as { resource?: unknown; uuid?: unknown; name?: unknown };
        return uuid || name ? { data: { resource, uuid, name } } : { data: '' };
    }
    return { data: source };
};

export const getAttributeFormValue = (
    contentType: AttributeContentType,
    descriptorContent: BaseAttributeContentModel[] | undefined,
    item: unknown,
): FormAttributeContentItem => {
    const normalizeContentItem = (value: Record<string, unknown>): FormAttributeContentItem => {
        const normalized: FormAttributeContentItem = {};

        if ('data' in value) {
            normalized.data = normalizePrimitiveAttributeValue(value.data);
        }
        if ('reference' in value && value.reference !== null && value.reference !== '') {
            normalized.reference = value.reference as string;
        }

        return normalized;
    };

    const normalizePrimitiveAttributeValue = (value: unknown): unknown => {
        if (value === undefined || value === null || value === '') return value;

        if (contentType === AttributeContentType.Integer || contentType === AttributeContentType.Float) {
            const parsedNumber = typeof value === 'number' ? value : Number(value);
            if (Number.isNaN(parsedNumber)) return value;

            if (contentType === AttributeContentType.Integer) return Math.trunc(parsedNumber);
            return parsedNumber;
        }

        return value;
    };

    if (contentType === AttributeContentType.Datetime) return getDatetimeFormValue(item);
    if (contentType === AttributeContentType.Date) return getDateFormValue(item);
    if (contentType === AttributeContentType.Codeblock) {
        const codeItem = (item ?? {}) as { code?: unknown; language?: ProgrammingLanguageEnum };
        const language = getCodeBlockLanguage(codeItem.language, descriptorContent);
        return { data: { code: utf8ToBase64(String(codeItem.code ?? '')), language } } as CodeBlockAttributeContentDtoV2;
    }
    if (contentType === AttributeContentType.Secret) {
        return { data: { secret: item } } as SecretAttributeContentV2;
    }
    if (contentType === AttributeContentType.Resource) return getResourceFormValue(item);
    if (item && typeof item === 'object' && ('data' in item || 'reference' in item)) {
        return normalizeContentItem(item as Record<string, unknown>);
    }
    if (item && typeof item === 'object' && 'value' in item) {
        const value = (item as { value: unknown }).value;
        if (value && typeof value === 'object' && ('data' in value || 'reference' in value)) {
            return normalizeContentItem(value as Record<string, unknown>);
        }
        return { data: normalizePrimitiveAttributeValue(value) };
    }
    return { data: normalizePrimitiveAttributeValue(item) };
};

/**
 * Determines the programming language for a code block attribute.
 * Falls back to descriptor's default content language if not specified in form input,
 * and ultimately defaults to JavaScript if no language is found.
 *
 * @param formInputLanguage - The language from the form input
 * @param descriptorContent - The descriptor's default content array
 * @returns The resolved programming language
 */
export const getCodeBlockLanguage = (
    formInputLanguage: ProgrammingLanguageEnum | undefined,
    descriptorContent: BaseAttributeContentModel[] | undefined,
): ProgrammingLanguageEnum => {
    // if language is not set in form input item, try to get it from the default content of descriptor
    if (formInputLanguage !== undefined) return formInputLanguage;
    if (descriptorContent && descriptorContent.length > 0) {
        const contentData = descriptorContent[0].data;
        if (contentData) {
            return (contentData as CodeBlockAttributeContentDataModel).language ?? ProgrammingLanguageEnum.Javascript;
        }
    }
    return ProgrammingLanguageEnum.Javascript;
};

export const resolveAttributeVersion = (descriptor: DataAttributeModel | CustomAttributeModel): AttributeVersion => {
    const schemaVersion = (descriptor as { schemaVersion?: AttributeVersion }).schemaVersion;
    if (schemaVersion === AttributeVersion.V2 || schemaVersion === AttributeVersion.V3) {
        return schemaVersion;
    }

    const version = (descriptor as { version?: AttributeVersion | number | string }).version;
    if (version === AttributeVersion.V3 || version === '3' || version === 3) {
        return AttributeVersion.V3;
    }

    return AttributeVersion.V2;
};

const resolveFinalAttributeVersion = (
    existingVersion: AttributeVersion | undefined,
    attributeVersion: AttributeVersion,
): AttributeVersion => {
    if (existingVersion === AttributeVersion.V3 || existingVersion === AttributeVersion.V2) {
        return existingVersion;
    }
    if (attributeVersion === AttributeVersion.V3) {
        return AttributeVersion.V3;
    }
    return AttributeVersion.V2;
};

export const buildAttributeRequestModel = (
    attributeName: string,
    contentArray: FormAttributeContentItem[],
    descriptor: DataAttributeModel | CustomAttributeModel,
    version: AttributeVersion,
): AttributeRequestModel => {
    if (version === AttributeVersion.V3) {
        const finalContent = contentArray.map((item) => ({
            ...item,
            contentType: descriptor.contentType,
        })) as BaseAttributeContentDtoV3[];
        const attr: AttributeRequestModelV3 = {
            name: attributeName,
            content: finalContent,
            contentType: descriptor.contentType,
            uuid: descriptor.uuid,
            version,
        };
        return attr;
    }
    const finalContent = contentArray as BaseAttributeContentDtoV2[];
    const attr: AttributeRequestModelV2 = {
        name: attributeName,
        content: finalContent,
        contentType: descriptor.contentType,
        uuid: descriptor.uuid,
        version,
    };
    return attr;
};

// The resource picker leaves a stub entry in the form value when the operator
// clears a previously-selected resource. Whatever shape the picker produces —
// primitive empty, object with empty data, single-pick scalar, react-select
// null — it normalises to a content shape whose `data` is empty, which fails
// polymorphic deserialisation on the backend with "missing type id property
// 'resource'". Strip the stub so a cleared selection serialises as either
// content: [] (list / multiSelect) or no attribute at all (single-pick).
function stripEmptyResourceContent(
    content: FormAttributeContentItem | FormAttributeContentItem[],
): FormAttributeContentItem | FormAttributeContentItem[] | undefined {
    if (Array.isArray(content)) {
        return content.filter((item) => item.data !== null && item.data !== undefined && item.data !== '');
    }
    if (content?.data === null || content?.data === undefined || content?.data === '') {
        return undefined;
    }
    return content;
}

function shouldSkipAttribute(
    attribute: string,
    attributes: Record<string, unknown>,
    deletedAttributes: string[],
    descriptors: AttributeDescriptorModel[],
): { skip: true } | { skip: false; descriptor: DataAttributeModel | CustomAttributeModel; attributeName: string } {
    if (!Object.hasOwn(attributes, attribute)) return { skip: true };
    const attributeName = attribute.split(':')[0];
    if (deletedAttributes.includes(attributeName)) return { skip: true };
    const descriptor = descriptors.find((d) => d.name === attributeName);
    if (!descriptor) return { skip: true };
    if (attributes[attribute] === undefined || attributes[attribute] === null) return { skip: true };
    if (!isDataAttributeModel(descriptor) && !isCustomAttributeModel(descriptor)) return { skip: true };
    return { skip: false, descriptor, attributeName };
}

export function collectFormAttributes(
    id: string,
    descriptors: AttributeDescriptorModel[] | undefined,
    values: FieldValues,
    existingAttributes?: Array<AttributeResponseModel | { name: string; version?: AttributeVersion }>,
): AttributeRequestModel[] {
    if (!descriptors || !values[`__attributes__${id}__`]) return [];

    const attributes = (values[`__attributes__${id}__`] ?? {}) as Record<string, unknown>;
    const deletedAttributes = (values[`deletedAttributes_${id}`] as string[] | undefined) ?? [];

    const attrs: AttributeRequestModel[] = [];

    for (const attribute in attributes) {
        const guard = shouldSkipAttribute(attribute, attributes, deletedAttributes, descriptors);
        if (guard.skip) continue;
        const { descriptor, attributeName } = guard;

        const rawValue = attributes[attribute];
        let content: FormAttributeContentItem | FormAttributeContentItem[] | undefined = Array.isArray(rawValue)
            ? rawValue.map((i: unknown) => getAttributeFormValue(descriptor.contentType, descriptor.content, i))
            : getAttributeFormValue(descriptor.contentType, descriptor.content, rawValue);

        if (descriptor.contentType === AttributeContentType.Resource) {
            content = stripEmptyResourceContent(content);
        }

        if (content === undefined) continue;
        if (!Array.isArray(content) && content.data === undefined) continue;

        const contentArray = Array.isArray(content) ? content : [content];
        const existing = existingAttributes?.find((a) => a.name === attributeName);
        const existingVersion = (existing as { version?: AttributeVersion })?.version;
        const version = resolveFinalAttributeVersion(existingVersion, resolveAttributeVersion(descriptor));

        attrs.push(buildAttributeRequestModel(attributeName, contentArray, descriptor, version));
    }
    return attrs;
}

type InputItem = {
    formAttributeName: string;
    formAttributeValue: unknown;
};

export function transformAttributes(data: InputItem[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    data.forEach(({ formAttributeName, formAttributeValue }) => {
        // split by the last dot
        const lastDotIndex = formAttributeName.lastIndexOf('.');
        if (lastDotIndex === -1) {
            // no dot found, just assign
            result[formAttributeName] = formAttributeValue;
        } else {
            const parentKey = formAttributeName.slice(0, lastDotIndex);
            const childKey = formAttributeName.slice(lastDotIndex + 1);

            const parent = (result[parentKey] as Record<string, unknown>) ?? {};
            parent[childKey] = formAttributeValue;
            result[parentKey] = parent;
        }
    });

    return result;
}

/**
 * Maps the attribute content to a selection option with a label and a value
 */
export const mapAttributeContentToOptionValue = (
    content: BaseAttributeContentModel,
    descriptor: DataAttributeModel | CustomAttributeModel,
) => {
    const datetimeLabel =
        descriptor.contentType === AttributeContentType.Datetime
            ? getFormattedDateTime(content?.data)?.toString()
            : (content?.data as unknown as string)?.toString();
    const nonReferenceLabel =
        descriptor.contentType === AttributeContentType.Date ? getFormattedDate(content?.data)?.toString() : datetimeLabel;
    return {
        label: content.reference ? content.reference : nonReferenceLabel,
        value: content,
    };
};

export const testAttributeSetFunction = (
    descriptor: DataAttributeModel | CustomAttributeModel,
    attribute: AttributeResponseModel | undefined,
    formAttributeName: string,
    setDefaultOnRequiredValuesOnly: boolean,
    forceDefaultDescriptorValue: boolean,
) => {
    let formAttributeValue: unknown;

    const appliedContent = forceDefaultDescriptorValue ? descriptor?.content : attribute?.content;

    function setMultiSelectListAttributeValue() {
        if (Array.isArray(appliedContent)) {
            formAttributeValue = appliedContent.map((content) => mapAttributeContentToOptionValue(content, descriptor));
        } else {
            formAttributeValue = undefined;
        }
    }

    function setSelectListAttributeValue() {
        if (appliedContent) {
            formAttributeValue = mapAttributeContentToOptionValue(appliedContent[0], descriptor);
        } else {
            formAttributeValue = undefined;
        }
    }

    function setBooleanAttributeValue() {
        if (appliedContent?.[0]?.data !== undefined) {
            formAttributeValue = appliedContent[0].data;
        } else if (descriptor.properties.required) {
            // set value to false, if attribute is required, has no value, and no default value are provided
            // otherwise allow the value to be undefined
            formAttributeValue = descriptor.content?.[0]?.data ?? false;
        } else {
            formAttributeValue = descriptor.content?.[0]?.data;
        }
    }

    if (descriptor.properties?.list && descriptor.properties?.multiSelect) {
        setMultiSelectListAttributeValue();
    } else if (descriptor.properties?.list) {
        setSelectListAttributeValue();
    } else if (appliedContent) {
        formAttributeValue = appliedContent[0].reference ?? appliedContent[0].data;
    } else if (
        descriptor.content &&
        descriptor.content.length > 0 &&
        descriptor.contentType !== AttributeContentType.Resource &&
        (!setDefaultOnRequiredValuesOnly || descriptor.properties.required)
    ) {
        formAttributeValue = descriptor.content[0].reference ?? descriptor.content[0].data;
    }

    if (descriptor.contentType === AttributeContentType.Codeblock && formAttributeValue !== undefined) {
        if ((formAttributeValue as CodeBlockAttributeContentDataModel).code === undefined) {
            formAttributeValue = {
                language: (formAttributeValue as CodeBlockAttributeContentDataModel).language,
            };
        } else {
            formAttributeValue = {
                code: base64ToUtf8((formAttributeValue as CodeBlockAttributeContentDataModel).code),
                language: (formAttributeValue as CodeBlockAttributeContentDataModel).language,
            };
        }
    }
    if (descriptor.contentType === AttributeContentType.Boolean) {
        setBooleanAttributeValue();
    }

    return {
        formAttributeName,
        formAttributeValue,
    };
};

export const mapProfileAttribute = <T extends FieldValues>(
    profile: T | undefined,
    multipleResourceCustomAttributes: Record<string, CustomAttributeModel[]>,
    resourceType: string,
    attributePath: string,
    formAttributePrefix: string,
) => {
    const getNestedValue = (obj: unknown, path: string): unknown =>
        path.split('.').reduce<unknown>((current, key) => (current == null ? undefined : (current as Record<string, unknown>)[key]), obj);

    const attributes = getNestedValue(profile, attributePath);
    if (!Array.isArray(attributes)) return [];

    return (attributes as AttributeResponseModel[])
        .map((attr) => {
            const matched = multipleResourceCustomAttributes[resourceType]?.find((x) => x.uuid === attr.uuid);
            if (!matched) {
                return null;
            }
            return testAttributeSetFunction(matched, attr, `${formAttributePrefix}.${attr.name}`, true, false);
        })
        .filter((x) => x !== null);
};
