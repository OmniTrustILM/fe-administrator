import type { AuditLogDto as AuditLogItemModel, AuditLogResponseDto } from './openapi';

export type { AuditLogDto as AuditLogItemDto, AuditLogDto as AuditLogItemModel } from './openapi';
export type { AuditLogResponseDto as AuditLogResponseModel, AuditLogResponseDto as AuditLogDto } from './openapi';

export type AuditLogModel = Omit<AuditLogResponseDto, 'items'> & { items: Array<AuditLogItemModel> };
