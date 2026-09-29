import { actions, selectors } from 'ducks/crypto-assets-dashboard';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { EntityType, actions as filterActions } from 'ducks/filters';
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import { CbomAssetSyncState, FilterConditionOperator, FilterFieldSource, PlatformEnum, PqcVerdict } from 'types/openapi';
import { LockTypeEnum } from 'types/user-interface';
import {
    CRYPTO_ASSET_FILTER_FIELDS,
    FALLBACK_SERIES_COLOR,
    buildEmptyFilter,
    buildEqualsFilter,
    formatShareOfEstate,
    getPqcVerdictChartColors,
    summarizeSyncCompleteness,
} from 'utils/cryptoAssetsDashboard';
import { getDonutChartColorsByRandomNumberOfOptions } from 'utils/dashboard';
import { dateFormatter } from 'utils/dateUtil';
import CountBadge from '../DashboardItem/CountBadge';
import DashboardSkeleton from '../DashboardItem/DashboardSkeleton';
import DonutChart from '../DashboardItem/DonutChart';
import HorizontalBarChart from '../DashboardItem/HorizontalBarChart';

const LINK = '../cryptoassets';
const CBOMS_LINK = '../cboms';
const CBOMS_REDIRECT = '/cboms';
const REDIRECT = '/cryptoassets';

const SYNC_STATE_CHART_COLORS: Record<string, string> = {
    [CbomAssetSyncState.Synced]: '#12a393',
    [CbomAssetSyncState.InProgress]: '#0b76cf',
    [CbomAssetSyncState.Pending]: '#b68b06',
    [CbomAssetSyncState.Failed]: '#EF4444',
};

function caption(text: string) {
    return <span className="text-sm text-content-subtle">{text}</span>;
}

function isEmpty(obj?: object) {
    return !obj || Object.keys(obj).length === 0;
}

function labelled(stat: { [key: string]: number } | undefined, toLabel: (code: string) => string) {
    return Object.fromEntries(Object.entries(stat ?? {}).map(([code, count]) => [toLabel(code), count]));
}

function CryptoAssetsDashboard() {
    const dispatch = useDispatch();

    const statistics = useSelector(selectors.statistics);
    const isFetching = useSelector(selectors.isFetching);

    const typeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CryptographicAssetType));
    const verdictEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.PqcVerdict));
    const syncStateEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CbomAssetSyncState));

    useEffect(() => {
        dispatch(actions.getStatistics());
    }, [dispatch]);

    const completeness = useMemo(() => summarizeSyncCompleteness(statistics?.syncCompleteness), [statistics?.syncCompleteness]);
    const verdictColors = useMemo(() => getPqcVerdictChartColors(statistics?.statByPqcVerdict), [statistics?.statByPqcVerdict]);
    const typeColors = useMemo(
        () => getDonutChartColorsByRandomNumberOfOptions(Object.keys(statistics?.statByType ?? {}).length),
        [statistics?.statByType],
    );

    if (isFetching || statistics === undefined) {
        return <DashboardSkeleton countBadges={4} charts={3} />;
    }

    const sourceCbomCount = statistics.sourceCbomCount;
    const cbomCountUnavailable = sourceCbomCount == null;
    const coverageData = Object.fromEntries(completeness.states.map((state) => [getEnumLabel(syncStateEnum, state.code), state.count]));
    const typeKeys = Object.keys(statistics.statByType ?? {});
    const verdictKeys = Object.keys(statistics.statByPqcVerdict ?? {});
    const notReadyCount = statistics.statByPqcVerdict?.[PqcVerdict.NotReady];
    const notReadyShare = formatShareOfEstate(notReadyCount, statistics.totalAssets);

    return (
        <div>
            <div className="mb-4 md:mb-8" data-testid="crypto-assets-dashboard-coverage">
                {cbomCountUnavailable || completeness.total === 0 ? (
                    <div className="rounded-xl border border-divider bg-surface-raised p-4 md:p-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-bold text-content">Inventory coverage</span>
                            {completeness.lastCompletedSyncAt &&
                                caption(`Last completed sync ${dateFormatter(completeness.lastCompletedSyncAt)}`)}
                        </div>
                        {cbomCountUnavailable ? (
                            <p className="mt-2 text-sm text-content-muted" data-testid="crypto-assets-dashboard-coverage-unavailable">
                                CBOM inventory coverage is not available with your permissions.
                            </p>
                        ) : (
                            <p className="mt-2 text-sm text-content-muted" data-testid="crypto-assets-dashboard-coverage-empty">
                                No CBOM document has been synced into the inventory yet, so the counts below are empty rather than complete.
                            </p>
                        )}
                    </div>
                ) : (
                    <DonutChart
                        title="Inventory coverage"
                        data={coverageData}
                        entity={EntityType.CBOM}
                        redirect={CBOMS_REDIRECT}
                        onSetFilter={(index) => buildEqualsFilter('CBOM_ASSET_SYNC_STATE', completeness.states[index].code)}
                        colorOptions={{
                            colors: completeness.states.map((state) => SYNC_STATE_CHART_COLORS[state.code] ?? FALLBACK_SERIES_COLOR),
                        }}
                        showCenterLabel
                        showValuesInLegend
                        footer={
                            <div className="mt-4 space-y-1">
                                <p className="text-sm text-content" data-testid="crypto-assets-dashboard-coverage-summary">
                                    {`Synced ${completeness.synced.toLocaleString()} of ${completeness.total.toLocaleString()} CBOM documents`}
                                </p>
                                {completeness.lastCompletedSyncAt &&
                                    caption(`Last completed sync ${dateFormatter(completeness.lastCompletedSyncAt)}`)}
                                {!completeness.isComplete && (
                                    <p className="text-sm text-warning" data-testid="crypto-assets-dashboard-coverage-partial">
                                        The estate is only partly synced. A document still syncing may add assets to these counts later.
                                    </p>
                                )}
                            </div>
                        }
                    />
                )}
            </div>

            <div className="flex flex-row gap-4 md:gap-8 mb-4 md:mb-8 flex-wrap" data-testid="crypto-assets-dashboard-counts">
                <div className="flex-1 min-w-[180px]">
                    <CountBadge
                        data={cbomCountUnavailable ? null : sourceCbomCount}
                        title="Source CBOMs"
                        link={cbomCountUnavailable ? undefined : CBOMS_LINK}
                        lockType={LockTypeEnum.PERMISSION}
                        lockText="You do not have permission to view the Source CBOM count."
                        entity={EntityType.CBOM}
                        onSetFilter={() => [
                            {
                                fieldSource: FilterFieldSource.Property,
                                condition: FilterConditionOperator.Equals,
                                fieldIdentifier: 'CBOM_HAS_CONTRIBUTED_ASSETS',
                                value: true,
                            },
                        ]}
                        extraComponent={caption('contributing at least one asset')}
                    />
                </div>
                <div className="flex-1 min-w-[180px]">
                    <CountBadge
                        data={statistics.totalAssets ?? 0}
                        title="Crypto Assets"
                        link={LINK}
                        entity={EntityType.CRYPTO_ASSET}
                        onSetFilter={() => []}
                        extraComponent={
                            cbomCountUnavailable ? undefined : caption(`deduplicated across ${sourceCbomCount.toLocaleString()} CBOMs`)
                        }
                    />
                </div>
                <div className="flex-1 min-w-[180px]">
                    <CountBadge
                        data={notReadyCount ?? 0}
                        title="Not PQC ready"
                        link={LINK}
                        entity={EntityType.CRYPTO_ASSET}
                        onSetFilter={() => buildEqualsFilter(CRYPTO_ASSET_FILTER_FIELDS.pqcVerdict, PqcVerdict.NotReady)}
                        extraComponent={notReadyShare ? caption(notReadyShare) : undefined}
                    />
                </div>
                <div className="flex-1 min-w-[180px]">
                    <CountBadge
                        data={statistics.distinctAlgorithmFamilyCount ?? 0}
                        title="Algorithm families"
                        extraComponent={
                            <Link
                                to={LINK}
                                className="text-sm text-brand hover:underline"
                                onClick={() =>
                                    dispatch(
                                        filterActions.setCurrentFilters({
                                            entity: EntityType.CRYPTO_ASSET,
                                            currentFilters: buildEmptyFilter(CRYPTO_ASSET_FILTER_FIELDS.algorithmFamily),
                                        }),
                                    )
                                }
                            >
                                {(statistics.unassignedAssetCount ?? 0).toLocaleString()} assets carry none
                            </Link>
                        }
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8" data-testid="crypto-assets-dashboard-charts">
                {!isEmpty(statistics.statByType) && (
                    <DonutChart
                        title="Assets by Type"
                        data={labelled(statistics.statByType, (code) => getEnumLabel(typeEnum, code))}
                        colorOptions={typeColors}
                        entity={EntityType.CRYPTO_ASSET}
                        onSetFilter={(index) => buildEqualsFilter(CRYPTO_ASSET_FILTER_FIELDS.type, typeKeys[index])}
                        redirect={REDIRECT}
                    />
                )}

                {!isEmpty(statistics.statByPqcVerdict) && (
                    <DonutChart
                        title="Assets by PQC Readiness"
                        data={labelled(statistics.statByPqcVerdict, (code) => getEnumLabel(verdictEnum, code))}
                        colorOptions={verdictColors}
                        entity={EntityType.CRYPTO_ASSET}
                        onSetFilter={(index) => buildEqualsFilter(CRYPTO_ASSET_FILTER_FIELDS.pqcVerdict, verdictKeys[index])}
                        redirect={REDIRECT}
                    />
                )}

                {!isEmpty(statistics.statByAlgorithmFamily) && (
                    <HorizontalBarChart
                        title="Assets by Algorithm Family"
                        data={statistics.statByAlgorithmFamily}
                        entity={EntityType.CRYPTO_ASSET}
                        redirect={REDIRECT}
                        overflowCount={statistics.distinctAlgorithmFamilyCount}
                        onSetFilter={(label) => buildEqualsFilter(CRYPTO_ASSET_FILTER_FIELDS.algorithmFamily, label)}
                    />
                )}
            </div>
        </div>
    );
}

export default CryptoAssetsDashboard;
