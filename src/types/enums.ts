import type { EnumItemDto } from './openapi';

export type { EnumItemDto, EnumItemDto as EnumItemModel } from './openapi';

export type PlatformEnumDto = { [key: string]: { [key: string]: EnumItemDto } };
export type PlatformEnumModel = { [key: string]: { [key: string]: EnumItemDto } };

/** One platform enum's items keyed by code, or undefined while the enums have not loaded. */
export type PlatformEnumMap = { [key: string]: EnumItemDto } | undefined;
