import type { AttributeMappingModel, AttributeRequestModel, AttributeResponseModel } from './attributes';
import type { NotificationInstanceDto, NotificationInstanceRequestDto } from './openapi';

export type { NotificationDto, NotificationDto as NotificationModel } from './openapi';

export type { NotificationInstanceDto as InstanceNotificationDto } from './openapi';
export type NotificationInstanceModel = Omit<NotificationInstanceDto, 'attributes' | 'attributeMappings'> & {
    attributes: Array<AttributeResponseModel>;
    attributeMappings?: Array<AttributeMappingModel>;
};

export type { NotificationInstanceRequestDto as InstanceNotificationRequestDto } from './openapi';
export type NotificationInstanceRequestModel = Omit<NotificationInstanceRequestDto, 'attributes' | 'attributeMappings'> & {
    attributes: Array<AttributeRequestModel>;
    attributeMappings?: Array<AttributeMappingModel>;
};
