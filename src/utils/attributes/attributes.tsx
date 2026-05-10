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

    const mapping = (content: BaseAttributeContentModel): string | React.ReactNode | undefined => {
        switch (contentType) {
            case AttributeContentType.Boolean:
                return content.data ? 'true' : 'false';
            case AttributeContentType.Credential:
            case AttributeContentType.Object:
            case AttributeContentType.File:
                return content.reference;
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
                return '*****';
        }
        return undefined;
    };

    const isFileAttributeContentData = (data: any): data is FileAttributeContentData => {
        return typeof data === 'object' && data !== null && 'fileName' in data && 'mimeType' in data;
    };

    const checkFileNameAndMimeType = (content: BaseAttributeContentModel): string | undefined => {
        if (isFileAttributeContentData(content.data)) {
            return `${content.data.fileName} (${content.data.mimeType})`;
        } else {
            return 'Unknown data type';
        }
    };

    return content.map((content) => mapping(content) ?? checkFileNameAndMimeType(content)).join(', ');
};

export const getAttributeFormValue = (
    contentType: AttributeContentType,
    descriptorContent: BaseAttributeContentModel[] | undefined,
    item: any,
) => {
    const normalizeContentItem = (value: any) => {
        if (!value || typeof value !== 'object') return value;

        const normalized: Record<string, unknown> = {};

        if ('data' in value) {
            normalized.data = normalizePrimitiveAttributeValue(value.data);
        }
        if ('reference' in value && value.reference !== null && value.reference !== '') {
            normalized.reference = value.reference;
        }

        return normalized;
    };

    const normalizePrimitiveAttributeValue = (value: unknown) => {
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
        const language = getCodeBlockLanguage(item?.language, descriptorContent);
        return { data: { code: utf8ToBase64(item.code), language } } as CodeBlockAttributeContentDtoV2;
    }
    if (contentType === AttributeContentType.Secret) {
        return { data: { secret: item } } as SecretAttributeContentV2;
    }
    if (item && typeof item === 'object' && ('data' in item || 'reference' in item)) {
        return normalizeContentItem(item);
    }
    if (item && typeof item === 'object' && 'value' in item) {
        if (item.value && typeof item.value === 'object' && ('data' in item.value || 'reference' in item.value)) {
            return normalizeContentItem(item.value);
        }
        return { data: normalizePrimitiveAttributeValue(item.value) };
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

const resolveAttributeVersion = (descriptor: DataAttributeModel | CustomAttributeModel): AttributeVersion => {
    const schemaVersion = (descriptor as any).schemaVersion;
    if (schemaVersion === AttributeVersion.V2 || schemaVersion === AttributeVersion.V3) {
        return schemaVersion;
    }

    const version = (descriptor as any).version;
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

const buildAttributeRequestModel = (
    attributeName: string,
    contentArray: any[],
    descriptor: DataAttributeModel | CustomAttributeModel,
    version: AttributeVersion,
): AttributeRequestModel => {
    if (version === AttributeVersion.V3) {
        const finalContent = contentArray.map((item: { data: unknown }) => ({
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

export function collectFormAttributes(
    id: string,
    descriptors: AttributeDescriptorModel[] | undefined,
    values: Record<string, any>,
    existingAttributes?: Array<AttributeResponseModel | { name: string; version?: AttributeVersion }>,
): AttributeRequestModel[] {
    if (!descriptors || !values[`__attributes__${id}__`]) return [];

    const attributes = values[`__attributes__${id}__`];
    const deletedAttributes = values[`deletedAttributes_${id}`] || [];

    const attrs: AttributeRequestModel[] = [];

    for (const attribute in attributes) {
        if (!Object.hasOwn(attributes, attribute)) continue;

        const attributeName = attribute.split(':')[0];

        if (deletedAttributes.includes(attributeName)) continue;

        const descriptor = descriptors?.find((d) => d.name === attributeName);
        if (!descriptor) continue;
        if (attributes[attribute] === undefined || attributes[attribute] === null) continue;
        if (!isDataAttributeModel(descriptor) && !isCustomAttributeModel(descriptor)) continue;

        const rawValue = attributes[attribute];
        let content = Array.isArray(rawValue)
            ? rawValue.map((i: any) => getAttributeFormValue(descriptor.contentType, descriptor.content, i))
            : getAttributeFormValue(descriptor.contentType, descriptor.content, rawValue);

        if (descriptor.contentType === AttributeContentType.Resource) {
            // The resource picker leaves a stub entry in the form value when the operator
            // clears a previously-selected resource. Whatever shape the picker produces —
            // primitive empty, object with empty data, single-pick scalar, react-select
            // null — it normalises to a content shape whose `data` is empty, which fails
            // polymorphic deserialisation on the backend with "missing type id property
            // 'resource'". Strip the stub so a cleared selection serialises as either
            // content: [] (list / multiSelect) or no attribute at all (single-pick).
            if (Array.isArray(content)) {
                content = content.filter((item: { data: unknown }) => item.data !== null && item.data !== undefined && item.data !== '');
            } else if (content?.data === null || content?.data === undefined || content?.data === '') {
                content = undefined;
            }
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
    formAttributeValue: any;
};

export function transformAttributes(data: InputItem[]): Record<string, any> {
    const result: Record<string, any> = {};

    data.forEach(({ formAttributeName, formAttributeValue }) => {
        // split by the last dot
        const lastDotIndex = formAttributeName.lastIndexOf('.');
        if (lastDotIndex === -1) {
            // no dot found, just assign
            result[formAttributeName] = formAttributeValue;
        } else {
            const parentKey = formAttributeName.slice(0, lastDotIndex);
            const childKey = formAttributeName.slice(lastDotIndex + 1);

            if (!result[parentKey]) {
                result[parentKey] = {};
            }
            result[parentKey][childKey] = formAttributeValue;
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
            ? getFormattedDateTime(content?.data as unknown as string)?.toString()
            : (content?.data as unknown as string)?.toString();
    const nonReferenceLabel =
        descriptor.contentType === AttributeContentType.Date
            ? getFormattedDate(content?.data as unknown as string)?.toString()
            : datetimeLabel;
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
    let formAttributeValue;

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

export const mapProfileAttribute = <T extends Record<string, any>>(
    profile: T | undefined,
    multipleResourceCustomAttributes: Record<string, CustomAttributeModel[]>,
    resourceType: string,
    attributePath: string,
    formAttributePrefix: string,
) => {
    const getNestedValue = (obj: any, path: string) => {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    };

    const attributes = getNestedValue(profile, attributePath);

    return (
        attributes
            ?.map((attr: any) => {
                const matched = multipleResourceCustomAttributes[resourceType]?.find((x) => x.uuid === attr.uuid);
                if (!matched) {
                    return null;
                }
                return testAttributeSetFunction(matched, attr, `${formAttributePrefix}.${attr.name}`, true, false);
            })
            .filter((x: any) => x !== null) ?? []
    );
};
