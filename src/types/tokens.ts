import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type { MetadataModel } from './locations';
import type { TokenInstanceDetailDto, TokenInstanceDto, TokenInstanceRequestDto, TokenInstanceStatusComponent } from './openapi';

export type {
    TokenInstanceStatusDetailDto as TokenInstanceStatusResponseDto,
    TokenInstanceStatusDetailDto as TokenInstanceStatusResponseModel,
} from './openapi';

export type TokenRequestDto = Omit<TokenInstanceRequestDto, 'kind'> & { kind?: string };
export type TokenResponseDto = Omit<TokenInstanceDto, 'kind'> & { kind?: string };
export type TokenResponseModel = TokenResponseDto;
export type TokenDetailResponseDto = Omit<TokenInstanceDetailDto, 'kind'> & { kind?: string };

/**
 * The generated client still requires kind until the upstream contract is updated, while V2 requests intentionally omit it.
 */
export function toGeneratedTokenRequestDto(token: TokenRequestDto): TokenInstanceRequestDto {
    return token as unknown as TokenInstanceRequestDto;
}

export type TokenRequestModel = Omit<TokenRequestDto, 'attributes' | 'customAttributes'> & {
    attributes: Array<AttributeRequestModel>;
    customAttributes: Array<AttributeRequestModel>;
};

export type TokenInstanceStatusComponentResponseDto = { [key: string]: TokenInstanceStatusComponent };
export type TokenInstanceStatusComponentResponseModel = { [key: string]: TokenInstanceStatusComponent };

export type TokenDetailResponseModel = Omit<TokenDetailResponseDto, 'attributes' | 'customAttributes' | 'metadata'> & {
    attributes: Array<AttributeResponseModel>;
    customAttributes?: Array<AttributeResponseModel>;
    metadata?: Array<MetadataModel>;
};
