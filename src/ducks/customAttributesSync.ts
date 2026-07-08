import type { ActionReducerMapBuilder, PayloadAction } from '@reduxjs/toolkit';
import type { AttributeResponseModel } from 'types/attributes';
import type { Resource } from 'types/openapi';
import { slice as customAttributesSlice } from './customAttributes';

type CustomAttributesContentPayload = {
    resource: Resource;
    resourceUuid: string;
    customAttributes: AttributeResponseModel[];
};

type ProfileDetail = { uuid: string; customAttributes?: AttributeResponseModel[] };

/**
 * Registers extraReducers that keep a loaded profile detail's custom attributes in sync when
 * custom attribute content is added/removed on the detail page. Without this, the profile slice
 * keeps stale custom attributes and a reopened edit form shows values from a previous session.
 *
 * Shared by the profile slices (ACME/SCEP/CMP); only the resource and the detail selector vary.
 */
export function attachCustomAttributesSync<S>(
    builder: ActionReducerMapBuilder<S>,
    resource: Resource,
    selectProfileDetail: (state: S) => ProfileDetail | undefined,
): void {
    const sync = (state: S, action: PayloadAction<CustomAttributesContentPayload>) => {
        const profile = selectProfileDetail(state);
        if (profile && action.payload.resource === resource && profile.uuid === action.payload.resourceUuid) {
            profile.customAttributes = action.payload.customAttributes;
        }
    };

    builder.addCase(customAttributesSlice.actions.updateCustomAttributeContentSuccess, sync);
    builder.addCase(customAttributesSlice.actions.removeCustomAttributeContentSuccess, sync);
}
