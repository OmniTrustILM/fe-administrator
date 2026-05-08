import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';

import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import CustomAttributeWidget from 'components/Attributes/CustomAttributeWidget';
import StatusBadge from 'components/StatusBadge';

import { actions, selectors } from 'ducks/tsp-profiles';
import { Resource } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { createWidgetDetailHeaders } from 'utils/widget';

export const TspProfileDetail = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { id } = useParams();

    const tspProfile = useSelector(selectors.tspProfile);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isDeleting = useSelector(selectors.isDeleting);
    const isEnabling = useSelector(selectors.isEnabling);
    const isDisabling = useSelector(selectors.isDisabling);
    const deleteErrorMessage = useSelector(selectors.deleteErrorMessage);

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

    const isBusy = useMemo(
        () => isFetchingDetail || isDeleting || isEnabling || isDisabling,
        [isFetchingDetail, isDeleting, isEnabling, isDisabling],
    );

    const getFreshData = useCallback(() => {
        if (!id) return;
        dispatch(actions.getTspProfile({ uuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    const onEditClick = useCallback(() => {
        if (!tspProfile) return;
        navigate(`../${Resource.TspProfiles.toLowerCase()}/edit/${tspProfile.uuid}`);
    }, [tspProfile, navigate]);

    const onEnableClick = useCallback(() => {
        if (!tspProfile) return;
        dispatch(actions.enableTspProfile({ uuid: tspProfile.uuid }));
    }, [tspProfile, dispatch]);

    const onDisableClick = useCallback(() => {
        if (!tspProfile) return;
        dispatch(actions.disableTspProfile({ uuid: tspProfile.uuid }));
    }, [tspProfile, dispatch]);

    const onDeleteConfirmed = useCallback(() => {
        if (!tspProfile) return;
        dispatch(actions.deleteTspProfile({ uuid: tspProfile.uuid }));
        setConfirmDelete(false);
    }, [tspProfile, dispatch]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                id: 'edit',
                icon: 'pencil',
                disabled: false,
                tooltip: 'Edit',
                onClick: onEditClick,
            },
            {
                id: 'delete',
                icon: 'trash',
                disabled: false,
                tooltip: 'Delete',
                onClick: () => setConfirmDelete(true),
            },
            {
                id: 'enable',
                icon: 'check',
                disabled: tspProfile?.enabled ?? false,
                tooltip: 'Enable',
                onClick: onEnableClick,
            },
            {
                id: 'disable',
                icon: 'times',
                disabled: !(tspProfile?.enabled ?? false),
                tooltip: 'Disable',
                onClick: onDisableClick,
            },
        ],
        [tspProfile, onEditClick, onEnableClick, onDisableClick],
    );

    const tableHeader: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            tspProfile
                ? [
                      { id: 'uuid', columns: ['UUID', tspProfile.uuid] },
                      { id: 'name', columns: ['Name', tspProfile.name] },
                      { id: 'description', columns: ['Description', tspProfile.description || '—'] },
                      { id: 'status', columns: ['Status', <StatusBadge key="status" enabled={tspProfile.enabled} />] },
                      { id: 'signingUrl', columns: ['TSP Signing URL', tspProfile.signingUrl || '—'] },
                  ]
                : [],
        [tspProfile],
    );

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: 'TSP Profiles', href: `/${Resource.TspProfiles.toLowerCase()}` },
                    { label: tspProfile?.name || 'TSP Profile Details', href: '' },
                ]}
            />

            <Widget widgetLockName={LockWidgetNameEnum.TspProfileDetails} busy={isBusy} noBorder>
                <Container>
                    <Container className="md:grid grid-cols-2 items-start">
                        <Widget title="TSP Profile Details" widgetButtons={buttons} titleSize="large" refreshAction={getFreshData}>
                            <CustomTable headers={tableHeader} data={detailData} />
                        </Widget>

                        {tspProfile && (
                            <CustomAttributeWidget
                                resource={Resource.TspProfiles}
                                resourceUuid={tspProfile.uuid}
                                attributes={tspProfile.customAttributes}
                            />
                        )}
                    </Container>
                </Container>
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete TSP Profile"
                body="You are about to delete this TSP Profile. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={deleteErrorMessage.length > 0}
                caption="Delete TSP Profile"
                body={
                    <>
                        Failed to delete the TSP Profile. Please find the details below:
                        <br />
                        <br />
                        {deleteErrorMessage}
                    </>
                }
                toggle={() => dispatch(actions.clearDeleteErrorMessages())}
                buttons={[
                    {
                        color: 'secondary',
                        variant: 'outline',
                        onClick: () => dispatch(actions.clearDeleteErrorMessages()),
                        body: 'Close',
                    },
                ]}
            />
        </div>
    );
};
