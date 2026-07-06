import type {
    AttributeDescriptorCollectionDto,
    AttributeDescriptorCollectionModel,
    AttributeDescriptorDto,
    AttributeDescriptorModel,
    AttributeMappingModel,
    AttributeRequestDto,
    AttributeRequestModel,
    AttributeResponseDto,
    AttributeResponseModel,
    CustomAttributeDto,
    CustomAttributeModel,
} from 'types/attributes';
import type { CallbackAttributeDto, CallbackAttributeModel, HealthDto, HealthModel } from 'types/connectors';
import { type AttributeMappingDto, type HealthInfo, HealthStatus } from 'types/openapi';

export function transformAttributeResponseDtoToModel(attribute: AttributeResponseDto): AttributeResponseModel {
    if ('content' in attribute) {
        return {
            ...attribute,
            content: attribute.content ? structuredClone(attribute.content) : undefined,
        };
    }

    return {
        ...attribute,
        content: undefined,
    };
}

export function transformAttributeRequestModelToDto(attributeRequest: AttributeRequestModel): AttributeRequestDto {
    return {
        ...attributeRequest,
        content: structuredClone(attributeRequest.content),
    };
}

export function transformCustomAttributeDtoToModel(attribute: CustomAttributeDto): CustomAttributeModel {
    return {
        ...attribute,
        content: attribute.content ? structuredClone(attribute.content) : undefined,
    };
}

export function transformAttributeMappingDtoToModel(attributeMapping: AttributeMappingDto): AttributeMappingModel {
    return { ...attributeMapping };
}

export function transformAttributeMappingModelToDto(attributeMapping: AttributeMappingModel): AttributeMappingDto {
    return { ...attributeMapping };
}

export function transformAttributeDescriptorDtoToModel(attributeDescriptor: AttributeDescriptorDto): AttributeDescriptorModel {
    // BaseAttributeDto is not discriminated on `type` (it is typed as the full AttributeType enum),
    // so TypeScript cannot correlate a spread member with the matching AttributeDescriptorModel arm.
    // The DTO and model differ only in the (structurally compatible) content typing, so the assertion
    // to the precise model type is sound.
    return {
        ...attributeDescriptor,
        content: attributeDescriptor.content ? structuredClone(attributeDescriptor.content) : undefined,
    } as AttributeDescriptorModel;
}

export function transformAttributeDescriptorCollectionDtoToModel(
    collection: AttributeDescriptorCollectionDto,
): AttributeDescriptorCollectionModel {
    const result: AttributeDescriptorCollectionModel = {};

    for (const functionGroup in collection) {
        result[functionGroup] = {};

        for (const kind in collection[functionGroup]) {
            result[functionGroup][kind] = collection[functionGroup][kind].map((attrDesc) =>
                transformAttributeDescriptorDtoToModel(attrDesc),
            );
        }
    }
    return result;
}

export function transformHealthDtoToModel(health: HealthDto): HealthModel {
    const parts: { [key: string]: HealthModel } | undefined = health.parts ? {} : undefined;

    if (parts) {
        for (const key in health.parts) {
            parts[key] = transformHealthDtoToModel(health.parts[key]);
        }
    }

    return {
        status: health.status,
        description: health.description,
        parts,
    };
}

export function transformHealthInfoToModel(healthInfo: HealthInfo): HealthModel {
    const parts: { [key: string]: HealthModel } | undefined = healthInfo.components ? {} : undefined;

    if (parts && healthInfo.components) {
        Object.entries(healthInfo.components).forEach(([key, component]) => {
            const details = component.details || {};
            const description =
                typeof details.description === 'string'
                    ? details.description
                    : Object.entries(details)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(', ');

            parts[key] = {
                status: component.status ?? HealthStatus.Unknown,
                description: description || undefined,
                parts: undefined,
            };
        });
    }

    return {
        status: healthInfo.status ?? HealthStatus.Unknown,
        description: undefined,
        parts,
    };
}

export function transformCallbackAttributeModelToDto(callbackAttribute: CallbackAttributeModel): CallbackAttributeDto {
    return { ...callbackAttribute };
}
