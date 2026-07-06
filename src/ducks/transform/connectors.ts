import type {
    BulkActionDto,
    BulkActionModel,
    ConnectorRequestDto,
    ConnectorRequestModel,
    ConnectorResponseDto,
    ConnectorResponseModel,
    ConnectorUpdateRequestDto,
    ConnectorUpdateRequestModel,
    EndpointDto,
    EndpointModel,
    FunctionGroupDto,
    FunctionGroupModel,
} from 'types/connectors';
import { AuthType, type ConnectInfoDto, type ConnectorDetailDtoV2, type ConnectorDtoV2 } from 'types/openapi';
import { transformAttributeRequestModelToDto, transformAttributeResponseDtoToModel } from './attributes';

export function transformBulkActionDtoToModel(error: BulkActionDto): BulkActionModel {
    return { ...error };
}

export function transformEndpointDtoToModel(endPoint: EndpointDto): EndpointModel {
    return { ...endPoint };
}

export function transformFunctionGroupDtoToModel(functionGroup: FunctionGroupDto): FunctionGroupModel {
    return {
        ...functionGroup,
        kinds: functionGroup.kinds ?? [],
        endPoints: functionGroup.endPoints.map((endpoint) => transformEndpointDtoToModel(endpoint)),
    };
}

export function transformConnectorDetailV2ToModel(connector: ConnectorDetailDtoV2): ConnectorResponseModel {
    return {
        uuid: connector.uuid,
        name: connector.name,
        url: connector.url,
        status: connector.status,
        version: connector.version,
        authType: connector.authType,
        interfaces: connector.interfaces,
        functionGroups: connector.functionGroups.map(transformFunctionGroupDtoToModel),
        authAttributes: connector.authAttributes?.map((attr) => transformAttributeResponseDtoToModel(attr)),
        customAttributes: connector.customAttributes?.map(transformAttributeResponseDtoToModel),
        proxy: connector.proxy,
    };
}

export function transformConnectorDtoV2ToModel(connector: ConnectorDtoV2): ConnectorResponseModel {
    return {
        uuid: connector.uuid,
        name: connector.name,
        url: connector.url,
        status: connector.status,
        authType: AuthType.None,
        functionGroups: (connector.functionGroups ?? []).map(transformFunctionGroupDtoToModel),
        authAttributes: [],
        customAttributes: [],
        version: connector.version,
        interfaces: connector.interfaces ?? [],
        proxy: connector.proxy,
    };
}

export function transformConnectInfoDtoToFunctionGroups(info: ConnectInfoDto): FunctionGroupModel[] {
    if ('functionGroups' in info && Array.isArray(info.functionGroups)) {
        // V1 shape
        return info.functionGroups.map((fg) => transformFunctionGroupDtoToModel(fg));
    }
    // V2 shape does not expose function groups directly
    return [];
}

export function transformConnectorResponseDtoToModel(connector: ConnectorResponseDto): ConnectorResponseModel {
    return {
        ...connector,
        authAttributes: connector.authAttributes?.map((attr) => transformAttributeResponseDtoToModel(attr)),
        functionGroups: connector.functionGroups.map((group) => transformFunctionGroupDtoToModel(group)),
        customAttributes: connector.customAttributes?.map(transformAttributeResponseDtoToModel),
    };
}

function mapConnectorRequestPayload<T extends ConnectorRequestModel | ConnectorUpdateRequestModel>(connector: T) {
    return {
        ...connector,
        authAttributes: connector.authAttributes?.map(transformAttributeRequestModelToDto),
        customAttributes: connector.customAttributes?.map(transformAttributeRequestModelToDto),
    };
}

export function transformConnectorRequestModelToDto(connector: ConnectorRequestModel): ConnectorRequestDto {
    return mapConnectorRequestPayload(connector);
}

export function transformConnectorUpdateRequestModelToDto(connector: ConnectorUpdateRequestModel): ConnectorUpdateRequestDto {
    return mapConnectorRequestPayload(connector);
}
