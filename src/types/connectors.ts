import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type {
    ConnectDto,
    ConnectorDto,
    ConnectorInterfaceDto,
    ConnectorRequestDto,
    ConnectorUpdateRequestDto,
    ConnectorVersion,
    ConnectRequestDto,
    EndpointDto,
    FunctionGroupDto,
    HealthDto,
    ProxyDto as ProxyResponseDto,
    RequestAttributeCallback,
} from './openapi';

export type {
    BulkActionMessageDto as BulkActionDto,
    BulkActionMessageDto as BulkActionModel,
    EndpointDto,
    EndpointDto as EndpointModel,
    FunctionGroupDto,
    ConnectorRequestDto,
    ConnectorUpdateRequestDto,
    ConnectorDto as ConnectorResponseDto,
    HealthDto,
    ConnectRequestDto,
    ConnectDto as ConnectResponseDto,
    RequestAttributeCallback as CallbackAttributeDto,
    RequestAttributeCallback as CallbackAttributeModel,
    CallbackRequest as CallbackConnectorDto,
    ResourceCallbackRequest as CallbackResourceDto,
} from './openapi';

export type FunctionGroupModel = Omit<FunctionGroupDto, 'endPoints'> & { endPoints: Array<EndpointDto> };

export type ConnectorRequestModel = Omit<ConnectorRequestDto, 'authAttributes | customAttributes'> & {
    authAttributes?: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type ConnectorUpdateRequestModel = Omit<ConnectorUpdateRequestDto, 'authAttributes | customAttributes'> & {
    authAttributes?: Array<AttributeRequestModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type ConnectorResponseModel = Omit<ConnectorDto, 'functionGroups | authAttributes | customAttributes'> & {
    functionGroups: Array<FunctionGroupModel>;
    authAttributes?: Array<AttributeResponseModel>;
    customAttributes?: Array<AttributeResponseModel>;
    version?: ConnectorVersion;
    interfaces?: Array<ConnectorInterfaceDto>;
    proxy?: ProxyResponseDto;
};

export type HealthModel = Omit<HealthDto, 'parts'> & { parts?: { [key: string]: HealthModel } };

export type ConnectRequestModel = Omit<ConnectRequestDto, 'authAttributes'> & { authAttributes?: Array<AttributeRequestModel> };

export type ConnectResponseModel = Omit<ConnectDto, 'functionGroup'> & { functionGroup: FunctionGroupModel };

export type CallbackConnectorModel = Omit<import('./openapi').CallbackRequest, 'requestAttributeCallback'> & {
    requestAttributeCallback: RequestAttributeCallback;
};

export type CallbackResourceModel = Omit<import('./openapi').ResourceCallbackRequest, 'requestAttributeCallback'> & {
    requestAttributeCallback: RequestAttributeCallback;
};
