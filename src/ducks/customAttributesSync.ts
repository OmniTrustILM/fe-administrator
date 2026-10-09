import type { ActionReducerMapBuilder, Draft, PayloadAction } from '@reduxjs/toolkit';
import type { AttributeResponseModel } from 'types/attributes';
import type { Resource } from 'types/openapi';
import { slice as customAttributesSlice } from './customAttributes';

type CustomAttributesContentPayload = {
    resource: Resource;
    resourceUuid: string;
    customAttributes: AttributeResponseModel[];
};

type ObjectDetail = { uuid: string; customAttributes?: AttributeResponseModel[] };

/** Keeps loaded detail attributes current after successful content changes. */
export function attachCustomAttributesSync<S>(
    builder: ActionReducerMapBuilder<S>,
    resource: Resource,
    selectDetail: (state: Draft<S>) => ObjectDetail | undefined,
): void {
    const sync = (state: Draft<S>, action: PayloadAction<CustomAttributesContentPayload>) => {
        const detail = selectDetail(state);
        if (detail && action.payload.resource === resource && detail.uuid === action.payload.resourceUuid) {
            detail.customAttributes = action.payload.customAttributes;
        }
    };

    builder.addCase(customAttributesSlice.actions.updateCustomAttributeContentSuccess, sync);
    builder.addCase(customAttributesSlice.actions.removeCustomAttributeContentSuccess, sync);
}
