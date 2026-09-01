import type { Observable } from 'rxjs';
import type { AjaxResponse } from 'rxjs/ajax';

import type { BaseAttributeDto } from './openapi';
import { BaseAPI, encodeURI as encodePathSegment, throwIfNullOrUndefined } from './openapi/runtime';
import type { HttpQuery, OperationOpts } from './openapi/runtime';

export interface ListTokenAttributesRequest {
    connectorUuid: string;
    kind?: string;
}

/**
 * Handwritten client for the token attribute endpoint until it is published in the OpenAPI contract.
 */
export class TokenInstanceAttributesApi extends BaseAPI {
    listTokenAttributes({ connectorUuid, kind }: ListTokenAttributesRequest): Observable<Array<BaseAttributeDto>>;
    listTokenAttributes(
        { connectorUuid, kind }: ListTokenAttributesRequest,
        opts?: OperationOpts,
    ): Observable<AjaxResponse<Array<BaseAttributeDto>>>;
    listTokenAttributes(
        { connectorUuid, kind }: ListTokenAttributesRequest,
        opts?: OperationOpts,
    ): Observable<Array<BaseAttributeDto> | AjaxResponse<Array<BaseAttributeDto>>> {
        throwIfNullOrUndefined(connectorUuid, 'connectorUuid', 'listTokenAttributes');

        const queryParams: HttpQuery = {};

        if (kind != null) queryParams.kind = kind;

        return this.request<Array<BaseAttributeDto>>(
            {
                url: '/v1/tokens/{connectorUuid}/attributes'.replace('{connectorUuid}', encodePathSegment(connectorUuid)),
                method: 'GET',
                queryParams,
            },
            opts?.responseOpts,
        );
    }
}
