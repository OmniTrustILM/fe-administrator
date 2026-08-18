import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';

import Badge from 'components/Badge';
import Container from 'components/Container';
import Dialog from 'components/Dialog';
import ForceDeleteErrorTable from 'components/ForceDeleteErrorTable';
import StatusBadge from 'components/StatusBadge';
import PagedList from 'components/PagedList/PagedList';
import type { TableDataRow, TableHeader } from 'components/CustomTable';

import type { ApiClients } from '../../../../api';
import { actions, selectors } from 'ducks/signing-profiles';
import { selectors as pagingSelectors } from 'ducks/paging';
import { EntityType } from 'ducks/filters';
import { SigningProtocol, SigningWorkflowType } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import type { SearchRequestModel } from 'types/certificate';

const workflowTypeLabels: Record<SigningWorkflowType, string> = {
    [SigningWorkflowType.Timestamping]: 'Timestamping',
    [SigningWorkflowType.ContentSigning]: 'Content Signing',
    [SigningWorkflowType.RawSigning]: 'Raw Signing',
};

const protocolLabels: Record<SigningProtocol, string> = {
    [SigningProtocol.Tsp]: 'TSP',
    [SigningProtocol.CscApi]: 'CSC API',
};

export default function SigningProfilesList() {
    const dispatch = useDispatch();

    const checkedRows = useSelector(pagingSelectors.checkedRows(EntityType.SIGNING_PROFILE));
    const signingProfiles = useSelector(selectors.signingProfiles);
    const bulkDeleteErrorMessages = useSelector(selectors.bulkDeleteErrorMessages);

    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isBulkEnabling = useSelector(selectors.isBulkEnabling);
    const isBulkDisabling = useSelector(selectors.isBulkDisabling);

    const isBusy = isBulkDeleting || isBulkEnabling || isBulkDisabling;

    const [showDeleteErrors, setShowDeleteErrors] = useState<boolean>(false);

    useEffect(() => {
        if (bulkDeleteErrorMessages.length > 0) {
            setShowDeleteErrors(true);
        }
    }, [bulkDeleteErrorMessages]);

    const onListCallback = useCallback(
        (filters: SearchRequestModel) => {
            dispatch(actions.listSigningProfiles(filters));
        },
        [dispatch],
    );

    const onEnableClick = useCallback(() => {
        dispatch(actions.bulkEnableSigningProfiles({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onDisableClick = useCallback(() => {
        dispatch(actions.bulkDisableSigningProfiles({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onCloseDeleteErrors = useCallback(() => {
        dispatch(actions.clearDeleteErrorMessages());
        setShowDeleteErrors(false);
    }, [dispatch]);

    const tableHeader: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
                sortable: true,
                sort: 'asc',
                width: '22%',
            },
            {
                id: 'description',
                content: 'Description',
                sortable: false,
                width: '28%',
            },
            {
                id: 'workflowType',
                content: 'Workflow Type',
                align: 'center',
                sortable: true,
                width: '16%',
            },
            {
                id: 'enabledProtocols',
                content: 'Enabled Protocols',
                align: 'center',
                sortable: false,
                width: '16%',
            },
            {
                id: 'version',
                content: 'Version',
                align: 'center',
                sortable: true,
                width: '9%',
            },
            {
                id: 'status',
                content: 'Status',
                align: 'center',
                sortable: true,
                width: '9%',
            },
        ],
        [],
    );

    const getProtocolsForDisplay = useCallback(
        (protocols?: SigningProtocol[]) =>
            protocols && protocols.length > 0 ? (
                <>
                    {protocols.map((protocol) => (
                        <Fragment key={protocol}>
                            <Badge color="secondary">{protocolLabels[protocol] ?? protocol}</Badge>
                            &nbsp;
                        </Fragment>
                    ))}
                </>
            ) : (
                <></>
            ),
        [],
    );

    const tableData: TableDataRow[] = useMemo(
        () =>
            signingProfiles.map((profile) => ({
                id: profile.uuid,
                columns: [
                    <span key="name" style={{ whiteSpace: 'nowrap' }}>
                        <Link to={`./detail/${profile.uuid}`}>{profile.name}</Link>
                    </span>,
                    <span key="description">{profile.description || ''}</span>,
                    <span key="workflowType">{workflowTypeLabels[profile.signingWorkflowType] ?? profile.signingWorkflowType}</span>,
                    <span key="enabledProtocols">{getProtocolsForDisplay(profile.enabledProtocols)}</span>,
                    <span key="version">{profile.version}</span>,
                    <StatusBadge key="status" enabled={profile.enabled} />,
                ],
            })),
        [getProtocolsForDisplay, signingProfiles],
    );

    return (
        <Container>
            <PagedList
                entity={EntityType.SIGNING_PROFILE}
                title="List of Signing Profiles"
                headers={tableHeader}
                data={tableData}
                isBusy={isBusy}
                onListCallback={onListCallback}
                pageWidgetLockName={LockWidgetNameEnum.ListOfSigningProfiles}
                filterTitle="Signing Profiles Filter"
                getAvailableFiltersApi={useCallback(
                    (apiClients: ApiClients) => apiClients.signingProfiles.listSigningProfileSearchableFields(),
                    [],
                )}
                onDeleteCallback={(uuids) => {
                    dispatch(actions.bulkDeleteSigningProfiles({ uuids }));
                }}
                additionalButtons={[
                    {
                        icon: 'check',
                        disabled: checkedRows.length === 0,
                        tooltip: 'Enable',
                        onClick: onEnableClick,
                    },
                    {
                        icon: 'times',
                        disabled: checkedRows.length === 0,
                        tooltip: 'Disable',
                        onClick: onDisableClick,
                    },
                ]}
                entityNameSingular="a Signing Profile"
                entityNamePlural="Signing Profiles"
                hasCheckboxes
            />

            <Dialog
                isOpen={showDeleteErrors}
                caption="Delete Signing Profiles"
                body={
                    <ForceDeleteErrorTable
                        items={bulkDeleteErrorMessages}
                        entityNameSingular="a Signing Profile"
                        entityNamePlural="Signing Profiles"
                        itemsCount={checkedRows.length}
                    />
                }
                toggle={onCloseDeleteErrors}
                buttons={[{ color: 'secondary', variant: 'outline', onClick: onCloseDeleteErrors, body: 'Close' }]}
            />
        </Container>
    );
}
