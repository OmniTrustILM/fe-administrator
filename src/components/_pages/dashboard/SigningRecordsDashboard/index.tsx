import DashboardSkeleton from '../DashboardItem/DashboardSkeleton';
import CountBadge from '../DashboardItem/CountBadge';
import DonutChart from '../DashboardItem/DonutChart';
import TimeSeriesChart from '../DashboardItem/TimeSeriesChart';
import HorizontalBarChart from '../DashboardItem/HorizontalBarChart';
import MutedBreakdown from '../DashboardItem/MutedBreakdown';
import { actions, selectors } from 'ducks/signing-records-dashboard';
import { actions as filterActions, selectors as filterSelectors, EntityType } from 'ducks/filters';
import { selectors as enumSelectors } from 'ducks/enums';
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FilterConditionOperator, FilterFieldSource, type SigningRecordStatisticsPeriod } from 'types/openapi';
import type { ApiClients } from 'src/api';
import type { SearchFilterModel } from 'types/certificate';
import { getSigningRecordDonutChartColors, getSigningSchemeLabel } from 'utils/dashboard';
import { resolveSigningRecordFilterField, type SigningRecordFilterKind } from 'utils/signingRecordsDashboardFilters';

const LINK = '../signingrecords';
const REDIRECT = '/signingrecords';

function caption(text: string) {
    return <span className="text-sm text-gray-400">{text}</span>;
}

function isEmpty(obj?: object) {
    return !obj || Object.keys(obj).length === 0;
}

function SigningRecordsDashboard() {
    const dispatch = useDispatch();
    const statistics = useSelector(selectors.statistics);
    const isFetching = useSelector(selectors.isFetching);
    const isFetchingSeries = useSelector(selectors.isFetchingSeries);
    const period = useSelector(selectors.period);
    const availableFilters = useSelector(filterSelectors.availableFilters(EntityType.SIGNING_RECORD));
    const platformEnums = useSelector(enumSelectors.platformEnums);

    useEffect(() => {
        dispatch(actions.getStatistics({ period }));
        dispatch(
            filterActions.getAvailableFilters({
                entity: EntityType.SIGNING_RECORD,
                getAvailableFiltersApi: (c: ApiClients) => c.signingRecords.listSigningRecordSearchableFields(),
            }),
        );
        // run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]);

    const equalsFilter = (kind: SigningRecordFilterKind, value: string): SearchFilterModel[] => {
        const field = resolveSigningRecordFilterField(availableFilters, kind);
        if (!field) return [];
        if (value === 'Unassigned') {
            return [
                {
                    fieldSource: FilterFieldSource.Property,
                    condition: FilterConditionOperator.Empty,
                    fieldIdentifier: field.fieldIdentifier,
                    value: [''],
                },
            ];
        }
        return [
            {
                fieldSource: FilterFieldSource.Property,
                condition: FilterConditionOperator.Equals,
                fieldIdentifier: field.fieldIdentifier,
                value: [value],
            },
        ];
    };

    const enumLabel = (platformEnumKey: string, code: string): string => {
        const enumMap = platformEnums?.[platformEnumKey];
        return enumMap?.[code]?.label ?? code;
    };

    const profileColors = useMemo(() => getSigningRecordDonutChartColors(statistics?.statByProfile), [statistics?.statByProfile]);

    if (isFetching || statistics === undefined) {
        return <DashboardSkeleton countBadges={4} charts={6} />;
    }

    const renderEnumBreakdown = (
        title: string,
        stat: { [key: string]: number } | undefined,
        platformEnumKey: string,
        kind: SigningRecordFilterKind,
        mutedCaption: string,
    ) => {
        if (isEmpty(stat)) return null;
        const keys = Object.keys(stat!);
        if (keys.length === 1) {
            return (
                <MutedBreakdown
                    key={title}
                    title={title}
                    label={enumLabel(platformEnumKey, keys[0])}
                    value={stat![keys[0]]}
                    caption={mutedCaption}
                />
            );
        }
        const labelled = Object.fromEntries(keys.map((code) => [enumLabel(platformEnumKey, code), stat![code]]));
        return (
            <DonutChart
                key={title}
                title={title}
                data={labelled}
                colorOptions={getSigningRecordDonutChartColors(stat)}
                entity={EntityType.SIGNING_RECORD}
                onSetFilter={(index) => equalsFilter(kind, keys[index])}
                redirect={REDIRECT}
            />
        );
    };

    const profileKeys = Object.keys(statistics.statByProfile ?? {});
    const schemeKeys = Object.keys(statistics.statByScheme ?? {});

    return (
        <div>
            <div className="flex flex-row gap-4 md:gap-8 mb-4 md:mb-8 flex-wrap" data-testid="signing-records-dashboard-counts">
                <div className="flex-1 min-w-[180px]">
                    <CountBadge
                        data={statistics.totalRetained}
                        title="Signing Records"
                        link={LINK}
                        extraComponent={caption('in retention window')}
                    />
                </div>
                <div className="flex-1 min-w-[180px]">
                    <CountBadge
                        data={statistics.countLast24h}
                        title="Signings – last 24h"
                        link={LINK}
                        extraComponent={caption('by signing time')}
                    />
                </div>
                <div className="flex-1 min-w-[180px]">
                    <CountBadge
                        data={statistics.countLast7d}
                        title="Signings – last 7d"
                        link={LINK}
                        extraComponent={caption('by signing time')}
                    />
                </div>
                <div className="flex-1 min-w-[180px]">
                    <CountBadge
                        data={statistics.activeProfileCount}
                        title="Active Signing Profiles"
                        link={LINK}
                        extraComponent={caption('produced ≥1 record')}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8" data-testid="signing-records-dashboard-charts">
                <TimeSeriesChart
                    title="Signings over Time"
                    data={statistics.volumeOverTime}
                    entity={EntityType.SIGNING_RECORD}
                    redirect={REDIRECT}
                    period={period}
                    isLoading={isFetchingSeries}
                    onPeriodChange={(next: SigningRecordStatisticsPeriod) => dispatch(actions.setPeriod({ period: next }))}
                    onSetFilter={(startIso, endIso) => {
                        const field = resolveSigningRecordFilterField(availableFilters, 'signingTime');
                        if (!field) return [];
                        return [
                            {
                                fieldSource: FilterFieldSource.Property,
                                condition: FilterConditionOperator.GreaterOrEqual,
                                fieldIdentifier: field.fieldIdentifier,
                                value: startIso,
                            },
                            {
                                fieldSource: FilterFieldSource.Property,
                                condition: FilterConditionOperator.Lesser,
                                fieldIdentifier: field.fieldIdentifier,
                                value: endIso,
                            },
                        ];
                    }}
                />

                {!isEmpty(statistics.statByProfile) &&
                    (profileKeys.length === 1 ? (
                        <MutedBreakdown
                            title="Signings by Signing Profile"
                            label={profileKeys[0]}
                            value={statistics.statByProfile![profileKeys[0]]}
                            caption="add another profile to compare"
                        />
                    ) : (
                        <DonutChart
                            title="Signings by Signing Profile"
                            data={statistics.statByProfile}
                            colorOptions={profileColors}
                            entity={EntityType.SIGNING_RECORD}
                            onSetFilter={(index) => equalsFilter('profile', profileKeys[index])}
                            redirect={REDIRECT}
                        />
                    ))}

                {!isEmpty(statistics.statByRequester) && (
                    <HorizontalBarChart
                        title="Top Requesters"
                        data={statistics.statByRequester}
                        entity={EntityType.SIGNING_RECORD}
                        redirect={REDIRECT}
                        overflowCount={statistics.distinctRequesterCount}
                        onSetFilter={(label) => equalsFilter('requester', label)}
                    />
                )}

                {renderEnumBreakdown(
                    'Signings by Workflow Type',
                    statistics.statByWorkflowType,
                    'SigningWorkflowType',
                    'workflowType',
                    'unlocks when content/raw signing ships',
                )}
                {renderEnumBreakdown(
                    'Signings by Protocol',
                    statistics.statByProtocol,
                    'SigningProtocol',
                    'protocol',
                    'unlocks when CSC API ships',
                )}

                {!isEmpty(statistics.statByScheme) &&
                    (schemeKeys.length === 1 ? (
                        <MutedBreakdown
                            title="Signings by Scheme"
                            label={getSigningSchemeLabel(schemeKeys[0])}
                            value={statistics.statByScheme![schemeKeys[0]]}
                            caption="unlocks with delegated / one-time key"
                        />
                    ) : (
                        <DonutChart
                            title="Signings by Scheme"
                            data={Object.fromEntries(
                                schemeKeys.map((code) => [getSigningSchemeLabel(code), statistics.statByScheme![code]]),
                            )}
                            colorOptions={getSigningRecordDonutChartColors(statistics.statByScheme)}
                            entity={EntityType.SIGNING_RECORD}
                            onSetFilter={(index) => equalsFilter('scheme', schemeKeys[index])}
                            redirect={REDIRECT}
                        />
                    ))}
            </div>
        </div>
    );
}

export default SigningRecordsDashboard;
