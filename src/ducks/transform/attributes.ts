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
import { type AttributeMappingDto, type HealthInfo, type HealthInfoComponent, HealthStatus, type ResponseAttributeV2 } from 'types/openapi';

export function transformAttributeResponseDtoToModel(attribute: AttributeResponseDto): AttributeResponseModel {
    if ('content' in attribute) {
        const attributeV2 = attribute as ResponseAttributeV2;

        return {
            ...attributeV2,
            content: attributeV2.content ? structuredClone(attributeV2.content) : undefined,
        };
    }

    return {
        ...attribute,
        content: undefined,
    } as AttributeResponseModel;
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
    return {
        ...attributeDescriptor,
        content: attributeDescriptor?.content ? structuredClone(attributeDescriptor.content) : undefined,
    };
}

export function transformAttributeDescriptorCollectionDtoToModel(
    collection: AttributeDescriptorCollectionDto,
): AttributeDescriptorCollectionModel {
    const result: AttributeDescriptorCollectionModel = {};

    for (const functionGroup in collection) {
        result[functionGroup] = {};

        for (const kind in collection[functionGroup]) {
            result[functionGroup]![kind] = collection[functionGroup]![kind].map((attrDesc) =>
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
            const comp = component as HealthInfoComponent;
            const details = comp.details || {};
            const description =
                typeof details.description === 'string'
                    ? (details.description as string)
                    : Object.entries(details)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(', ');

            parts[key] = {
                status: comp.status ?? HealthStatus.Unknown,
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
