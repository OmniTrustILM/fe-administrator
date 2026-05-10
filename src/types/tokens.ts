import type { AttributeRequestModel, AttributeResponseModel } from './attributes';
import type { MetadataModel } from './locations';
import type { TokenInstanceDetailDto, TokenInstanceRequestDto, TokenInstanceStatusComponent } from './openapi';

export type {
    TokenInstanceRequestDto as TokenRequestDto,
    TokenInstanceDto as TokenResponseDto,
    TokenInstanceDto as TokenResponseModel,
    TokenInstanceStatusDetailDto as TokenInstanceStatusResponseDto,
    TokenInstanceStatusDetailDto as TokenInstanceStatusResponseModel,
    TokenInstanceDetailDto as TokenDetailResponseDto,
} from './openapi';

export type TokenRequestModel = Omit<TokenInstanceRequestDto, 'attributes | customAttributes'> & {
    attributes: Array<AttributeRequestModel>;
    customAttributes: Array<AttributeRequestModel>;
};

export type TokenInstanceStatusComponentResponseDto = { [key: string]: TokenInstanceStatusComponent };
export type TokenInstanceStatusComponentResponseModel = { [key: string]: TokenInstanceStatusComponent };

export type TokenDetailResponseModel = Omit<TokenInstanceDetailDto, 'attributes | customAttributes | metadata'> & {
    attributes: Array<AttributeResponseModel>;
    customAttributes?: Array<AttributeResponseModel>;
    metadata?: Array<MetadataModel>;
};
