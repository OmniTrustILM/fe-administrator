import type { EnumItemDto } from './openapi';

export type { EnumItemDto, EnumItemDto as EnumItemModel } from './openapi';

export type PlatformEnumDto = { [key: string]: { [key: string]: EnumItemDto } };
export type PlatformEnumModel = { [key: string]: { [key: string]: EnumItemDto } };
