import { useEffect, useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { actions as customAttributesActions } from 'ducks/customAttributes';
import { testInitialState } from 'ducks/test-reducers';
import type { TokenInstanceDto } from 'types/openapi';
import type { TokenProfileDetailResponseModel } from 'types/token-profiles';
import { useRecordingStore } from 'utils/test-helpers';
import TokenProfileForm from './index';

const NO_TOKENS: TokenInstanceDto[] = [];

export type TokenProfileFormWithStoreProps = Readonly<{
    /** Route the form is rendered under — the source of the `:id` param the form used to trust. */
    initialRoute?: string;
    routePath?: string;
    usesGlobalModal?: boolean;
    tokens?: TokenInstanceDto[];
    /** Profile already in the store, as after its detail fetch. */
    tokenProfile?: TokenProfileDetailResponseModel;
}>;

/**
 * Mounts the form under an arbitrary route so a test can reproduce the global-modal case, where the
 * page underneath (e.g. a certificate detail page) owns the `:id` param. Building the store inside
 * the mounted component keeps it in the browser context — one created in the Node test body does
 * not transfer across the Playwright CT boundary.
 */
export function TokenProfileFormWithStore({
    initialRoute = '/certificates/detail/certificate-uuid',
    routePath = '/certificates/detail/:id',
    usesGlobalModal = false,
    tokens = NO_TOKENS,
    tokenProfile,
}: TokenProfileFormWithStoreProps) {
    const state = useMemo(
        () => ({
            tokens: { ...testInitialState.tokens, tokens },
            tokenprofiles: { ...testInitialState.tokenprofiles, tokenProfile },
        }),
        [tokens, tokenProfile],
    );
    const { store, dispatched } = useRecordingStore(state, 'tokenprofiles/');

    // Answers the form's custom attribute listing in place of its epic, so the busy overlay clears.
    useEffect(() => {
        store.dispatch(customAttributesActions.listResourceCustomAttributesSuccess([]));
    }, [store]);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[initialRoute]}>
                <Routes>
                    <Route path={routePath} element={<TokenProfileForm usesGlobalModal={usesGlobalModal} />} />
                </Routes>
            </MemoryRouter>
            <output data-testid="token-profile-actions">{dispatched.map(({ type }) => type).join(',')}</output>
        </Provider>
    );
}

export default TokenProfileFormWithStore;
