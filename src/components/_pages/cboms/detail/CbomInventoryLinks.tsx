import Callout from 'components/Callout';
import RetryCallout from 'components/RetryCallout';
import { selectors as authSelectors } from 'ducks/auth';
import { actions, selectors } from 'ducks/cbom';
import { EntityType, actions as filterActions } from 'ducks/filters';
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useResolvedPath } from 'react-router';
import { CbomAssetSyncState, type CbomDetailDto, Resource } from 'types/openapi';
import { type CbomInventoryState, type ComponentAssetLink, describeCbomInventoryState, UNLINKED_REASON_TEXT } from 'utils/cbom-asset-links';
import { buildEqualsFilter, CRYPTO_ASSET_FILTER_FIELDS } from 'utils/cryptoAssetsDashboard';
import { onSameTabClick } from 'utils/link-click';

const CRYPTO_ASSETS_PATH = `/${Resource.CryptoAssets.toLowerCase()}`;
const CBOMS_PATH = `/${Resource.Cboms.toLowerCase()}`;
const LINK_CLASS = 'text-brand hover:underline';

/** Reads the inventory side of the CBOM on screen, loading the assets it contributed once per loaded record. */
export function useCbomInventory(detail: CbomDetailDto | undefined): { state: CbomInventoryState; reload: () => void } {
    const dispatch = useDispatch();

    const profile = useSelector(authSelectors.profile);
    const versions = useSelector(selectors.selectCbomVersions);
    const isFetchingVersions = useSelector(selectors.selectIsFetchingVersions);
    const contributed = useSelector(selectors.selectContributedAssets);

    const canListCryptoAssets = profile?.permissions.allowedListings.includes(Resource.CryptoAssets) ?? false;

    // The slice keeps the last record across visits, and the page replaces it right after mounting: loading for the
    // one found at mount would fetch for a record that is about to be read again, or for another CBOM altogether.
    const detailAtMount = useRef(detail);

    const reload = useCallback(() => {
        if (!detail || !canListCryptoAssets || detail.assetSyncState !== CbomAssetSyncState.Synced) return;
        dispatch(actions.listCbomContributedAssets({ uuid: detail.uuid }));
    }, [dispatch, detail, canListCryptoAssets]);

    useEffect(() => {
        if (detail === detailAtMount.current) return;
        detailAtMount.current = undefined;
        reload();
    }, [detail, reload]);

    const state = useMemo(
        () => describeCbomInventoryState({ record: detail, versions, isFetchingVersions, canListCryptoAssets, contributed }),
        [detail, versions, isFetchingVersions, canListCryptoAssets, contributed],
    );

    return { state, reload };
}

type AssetNameProps = Readonly<{
    name: ReactNode;
    /** Absent while the record has no inventory links to speak of, so the name stands alone as it does in the document. */
    link?: ComponentAssetLink;
}>;

export function CbomAssetName({ name, link }: AssetNameProps) {
    if (!link) return <>{name}</>;

    if ('assetUuid' in link) {
        return <Link to={`${CRYPTO_ASSETS_PATH}/detail/${link.assetUuid}`}>{name}</Link>;
    }

    return (
        <div className="flex flex-col gap-0.5">
            <span>{name}</span>
            <span className="text-xs text-content-subtle" data-testid="cbom-asset-unlinked-reason">
                {UNLINKED_REASON_TEXT[link.unlinked]}
            </span>
        </div>
    );
}

function Notice({ children, dataTestId }: Readonly<{ children: ReactNode; dataTestId: string }>) {
    return (
        <div className="mb-4 rounded-md border border-divider bg-surface-sunken p-4 text-sm" role="status" data-testid={dataTestId}>
            {children}
        </div>
    );
}

type StatusProps = Readonly<{
    state: CbomInventoryState;
    serialNumber: string;
    onRetry: () => void;
}>;

/** Says, above the asset table, where its rows stand against the crypto asset inventory. */
export function CbomInventoryStatus({ state, serialNumber, onRetry }: StatusProps) {
    const dispatch = useDispatch();
    const cryptoAssetsPath = useResolvedPath(CRYPTO_ASSETS_PATH).pathname;

    switch (state.kind) {
        case 'unavailable':
            return null;

        case 'loading':
            return (
                <p className="mb-4 text-sm text-content-subtle" role="status" data-testid="cbom-inventory-loading">
                    Loading the links to the crypto asset inventory...
                </p>
            );

        case 'syncPending':
            return (
                <Notice dataTestId="cbom-inventory-sync-pending">
                    The assets of this CBOM are not in the crypto asset inventory yet: its asset sync is{' '}
                    {state.syncState === CbomAssetSyncState.InProgress ? 'in progress' : 'pending'}. The rows link to the inventory once the
                    sync completes.
                </Notice>
            );

        case 'syncFailed':
            return (
                <Callout severity="danger" role="status" className="mb-4" dataTestId="cbom-inventory-sync-failed">
                    The assets of this CBOM are not in the crypto asset inventory, because its asset sync failed
                    {state.error ? `: ${state.error}` : '.'}
                </Callout>
            );

        case 'noPermission':
            return (
                <Notice dataTestId="cbom-inventory-no-permission">
                    The rows are not linked to the crypto asset inventory, because you do not have permission to list crypto assets.
                </Notice>
            );

        case 'loadFailed':
            return (
                <div className="mb-4" data-testid="cbom-inventory-load-failed">
                    <RetryCallout
                        message={state.error ?? 'The links to the crypto asset inventory could not be loaded.'}
                        onRetry={onRetry}
                    />
                </div>
            );

        case 'superseded':
            return (
                <Notice dataTestId="cbom-inventory-superseded">
                    The assets of this CBOM are no longer in the crypto asset inventory under this version: a later version has synced since
                    and holds them now.{' '}
                    <Link className={LINK_CLASS} to={`${CBOMS_PATH}/detail/${state.holder.uuid}`}>
                        Open version {state.holder.version}
                    </Link>
                </Notice>
            );

        case 'noContribution':
            return (
                <Notice dataTestId="cbom-inventory-no-contribution">
                    The rows are not linked to the crypto asset inventory: no crypto asset you can list comes from this CBOM.
                </Notice>
            );

        case 'contributing':
            return (
                <div className="mb-4 text-sm">
                    <Link
                        to={CRYPTO_ASSETS_PATH}
                        className={LINK_CLASS}
                        data-testid="cbom-inventory-link"
                        onClick={onSameTabClick(() =>
                            dispatch(
                                filterActions.setDrillDownFilters({
                                    entity: EntityType.CRYPTO_ASSET,
                                    filters: buildEqualsFilter(CRYPTO_ASSET_FILTER_FIELDS.sourceCbom, serialNumber),
                                    path: cryptoAssetsPath,
                                }),
                            ),
                        )}
                    >
                        View the assets of this CBOM in the crypto asset inventory
                    </Link>
                </div>
            );
    }
}
