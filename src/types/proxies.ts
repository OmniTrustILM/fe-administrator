import type {
    ProxyDto,
    ProxyListDto as ProxyListDtoOpenApi,
    ProxyRequestDto as ProxyRequestDtoOpenApi,
    ProxyUpdateRequestDto as ProxyUpdateRequestDtoOpenApi,
} from './openapi';

export type ProxyRequestDto = ProxyRequestDtoOpenApi;
export type ProxyUpdateRequestDto = ProxyUpdateRequestDtoOpenApi;
export type ProxyResponseDto = ProxyDto;
export type ProxyResponseModel = ProxyDto;
export type ProxyListDto = ProxyListDtoOpenApi;
export type ProxyListModel = ProxyListDtoOpenApi;
