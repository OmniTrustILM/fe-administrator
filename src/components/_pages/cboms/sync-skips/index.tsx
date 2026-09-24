import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Breadcrumb from 'components/Breadcrumb';
import Dialog from 'components/Dialog';
import PagedList from 'components/PagedList/PagedList';
import { actions, selectors } from 'ducks/cbom-sync-skips';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { EntityType } from 'ducks/filters';
import type { ApiClients } from 'src/api';
import type { SearchRequestModel } from 'types/certificate';
import { type CbomSyncSkipDto, PlatformEnum } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { dateFormatter } from 'utils/dateUtil';
import { buildCbomSyncSkipRows, CBOM_SYNC_SKIP_HEADERS } from './cbomSyncSkipTableHelpers';

/**
 * The documents the CBOM sync found in the repository listing but could not store: still being retried, or written off
 * after the retry budget. A written-off document can be sent back to the next run from here.
 */
function CbomSyncSkipsList() {
    const dispatch = useDispatch();

    const skips = useSelector(selectors.selectSkipList);
    const isFetching = useSelector(selectors.selectIsFetchingList);
    const retryingUuid = useSelector(selectors.selectRetryingUuid);
    const refreshToken = useSelector(selectors.selectListRefreshToken);
    const stateEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CbomSyncSkipState));

    const [retryCandidate, setRetryCandidate] = useState<CbomSyncSkipDto | undefined>(undefined);

    const rows = useMemo(
        () => buildCbomSyncSkipRows(skips, { stateEnum, getEnumLabel, dateFormatter, retryingUuid, onRetry: setRetryCandidate }),
        [skips, stateEnum, retryingUuid],
    );

    const onList = useCallback((filters: SearchRequestModel) => dispatch(actions.listSyncSkips(filters)), [dispatch]);

    const onRetryConfirmed = useCallback(() => {
        if (retryCandidate) {
            dispatch(actions.retrySyncSkip({ uuid: retryCandidate.uuid }));
        }
        setRetryCandidate(undefined);
    }, [dispatch, retryCandidate]);

    return (
        <>
            <Breadcrumb
                items={[
                    { label: 'CBOM Inventory', href: '/cboms' },
                    { label: 'Skipped Documents', href: '' },
                ]}
            />

            <PagedList
                entity={EntityType.CBOM_SYNC_SKIP}
                onListCallback={onList}
                getAvailableFiltersApi={useCallback(
                    (apiClients: ApiClients) => apiClients.cbomManagement.getCbomSyncSkipSearchableFields(),
                    [],
                )}
                headers={CBOM_SYNC_SKIP_HEADERS}
                data={rows}
                isBusy={isFetching || retryingUuid !== undefined}
                title="Skipped CBOM documents"
                filterTitle="Skipped documents filter"
                entityNameSingular="a skipped document"
                entityNamePlural="skipped documents"
                addHidden
                hideWidgetButtons
                hasCheckboxes={false}
                pageWidgetLockName={LockWidgetNameEnum.ListOfCbomSyncSkips}
                refreshToken={refreshToken}
            />

            <Dialog
                isOpen={retryCandidate !== undefined}
                caption="Retry a skipped document"
                body={
                    retryCandidate
                        ? `The sync gave up on ${retryCandidate.serialNumber} version ${retryCandidate.version} after ${retryCandidate.attempts} attempt(s): ${retryCandidate.reason}. Send it back to the next sync run with a full retry budget?`
                        : ''
                }
                toggle={() => setRetryCandidate(undefined)}
                icon="refresh"
                size="md"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setRetryCandidate(undefined), body: 'Cancel' },
                    { color: 'primary', onClick: onRetryConfirmed, body: 'Retry' },
                ]}
            />
        </>
    );
}

export default CbomSyncSkipsList;
