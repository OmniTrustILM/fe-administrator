import type {
    ProxyListDto,
    ProxyListModel,
    ProxyRequestDto,
    ProxyResponseDto,
    ProxyResponseModel,
    ProxyUpdateRequestDto,
} from 'types/proxies';

export function transformProxyResponseDtoToModel(proxy: ProxyResponseDto): ProxyResponseModel {
    return { ...proxy };
}

export function transformProxyListDtoToModel(proxy: ProxyListDto): ProxyListModel {
    return { ...proxy };
}

export function transformProxyRequestModelToDto(proxy: ProxyRequestDto): ProxyRequestDto {
    return { ...proxy };
}

export function transformProxyUpdateRequestModelToDto(proxy: ProxyUpdateRequestDto): ProxyUpdateRequestDto {
    return { ...proxy };
}
