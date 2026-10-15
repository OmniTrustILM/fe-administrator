import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { alertsSlice, type State as AlertState } from 'ducks/alert-slice';
import { slice as cbomSlice, type State as CbomState } from 'ducks/cbom';
import {
    actions as customAttributeActions,
    slice as customAttributeSlice,
    type State as CustomAttributeState,
} from 'ducks/customAttributes';
import { testReducers } from 'ducks/test-reducers';
import type { CustomAttributeModel } from 'types/attributes';
import { type CbomUploadRequestDto, Resource } from 'types/openapi';
import CbomUploadDialog from '.';

const LISTING_FAILURE = 'Failed to get Resource Custom Attributes list (503): Service unavailable';

type SharedState = Omit<ReturnType<typeof testReducers>, 'alerts' | 'customAttributes'> & {
    alerts: AlertState;
    customAttributes: CustomAttributeState;
};

type State = SharedState & { cbom: CbomState };

function reducer(state: State | undefined, action: UnknownAction): State {
    // The test reducers know nothing of the cbom slice, so it is kept out of what they are handed.
    const { cbom, ...shared } = state ?? {};
    const sharedState = state ? (shared as SharedState) : undefined;
    return {
        ...testReducers(sharedState, action),
        alerts: alertsSlice.reducer(sharedState?.alerts, action),
        customAttributes: customAttributeSlice.reducer(sharedState?.customAttributes, action),
        cbom: cbomSlice.reducer(cbom, action),
    };
}

type Props = Readonly<{
    onUpload: (data: CbomUploadRequestDto) => void;
    /** The CBOM custom attribute definitions every listing answers with. */
    customAttributes?: CustomAttributeModel[];
    /** How many listings fail, from the first, before one is answered. */
    failedListings?: number;
    /** Leaves every listing in flight. */
    pendingListing?: boolean;
}>;

const noop = () => {};

/** Answers the dialog's CBOM custom attribute listing in place of its epic; a listing for another resource stays unanswered. */
const listingAnswers = ({ customAttributes = [], failedListings = 0, pendingListing = false }: Omit<Props, 'onUpload'>): Middleware => {
    let failuresLeft = failedListings;
    return (api) => (next) => (action) => {
        const result = next(action);
        if (customAttributeActions.listResourceCustomAttributes.match(action) && action.payload === Resource.Cboms && !pendingListing) {
            if (failuresLeft > 0) {
                failuresLeft--;
                api.dispatch(customAttributeActions.listResourceCustomAttributesFailure({ error: LISTING_FAILURE }));
            } else {
                api.dispatch(customAttributeActions.listResourceCustomAttributesSuccess(customAttributes));
            }
        }
        return result;
    };
};

export default function CbomUploadDialogWithStore({ onUpload, customAttributes, failedListings, pendingListing }: Props) {
    const store = useMemo(
        () =>
            configureStore({
                reducer,
                middleware: (getDefaultMiddleware) =>
                    getDefaultMiddleware({ serializableCheck: false }).concat(
                        listingAnswers({ customAttributes, failedListings, pendingListing }),
                    ),
            }),
        [customAttributes, failedListings, pendingListing],
    );

    return (
        <Provider store={store}>
            <MemoryRouter>
                <CbomUploadDialog onCancel={noop} onUpload={onUpload} />
            </MemoryRouter>
        </Provider>
    );
}
