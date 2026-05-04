import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import CustomOIDForm from 'components/_pages/custom-oid/form';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { actions, selectors } from 'ducks/oids';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import { LockWidgetNameEnum } from 'types/user-interface';
import { OidCategory, PlatformEnum, Resource } from 'types/openapi';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { getEditAndDeleteWidgetButtons, createWidgetDetailHeaders, createTableDataRow } from 'utils/widget';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';
import DetailPageSkeleton from 'components/DetailPageSkeleton';

export default function CustomOIDDetail() {
    const dispatch = useDispatch();

    const { id } = useParams();

    const oid = useSelector(selectors.oid);

    const isFetching = useSelector(selectors.isFetching);
    const isDeleting = useSelector(selectors.isDeleting);
    const isUpdating = useSelector(selectors.isUpdating);
    const updateOidSucceeded = useSelector(selectors.updateOidSucceeded);
    const oidCategoryEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.OidCategory));
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const isBusy = useMemo(() => isFetching || isDeleting, [isFetching, isDeleting]);

    const showAdditionalProperties = useMemo(() => {
        if (!oid) return false;
        return oid.category === OidCategory.RdnAttributeType;
    }, [oid]);

    const getFreshOIDDetails = useCallback(() => {
        if (!id) return;
        dispatch(actions.resetState());
        dispatch(actions.getOID({ oid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshOIDDetails();
    }, [getFreshOIDDetails, id]);

    const handleOpenEditDialog = useCallback(() => {
        if (!oid) return;
        setIsEditDialogOpen(true);
    }, [oid]);

    const handleCloseEditDialog = useCallback(() => {
        setIsEditDialogOpen(false);
    }, []);

    useRunOnSuccessfulFinish(isUpdating, updateOidSucceeded, () => {
        if (isEditDialogOpen) {
            handleCloseEditDialog();
            getFreshOIDDetails();
        }
    });

    const onDeleteConfirmed = useCallback(() => {
        if (!oid) return;

        dispatch(actions.deleteOID({ oid: oid.oid }));
        setConfirmDelete(false);
    }, [oid, dispatch]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => getEditAndDeleteWidgetButtons(handleOpenEditDialog, setConfirmDelete),
        [handleOpenEditDialog],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            !oid
                ? []
                : [
                      createTableDataRow('OID', oid.oid),
                      createTableDataRow('Display Name', oid.displayName),
                      createTableDataRow('Description', oid.description),
                      createTableDataRow('Category', oidCategoryEnum[oid.category as OidCategory]?.label),
                  ],
        [oid, oidCategoryEnum],
    );

    const additionalPropertiesData: TableDataRow[] = useMemo<TableDataRow[]>(
        () =>
            !oid
                ? []
                : [
                      createTableDataRow('Code', oid.additionalProperties?.code),
                      createTableDataRow('Alternative Codes', oid.additionalProperties?.altCodes?.join(', ')),
                  ],
        [oid],
    );

    if (isFetching) {
        return <DetailPageSkeleton layout="simple" buttonsCount={2} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Oids)} Inventory`, href: '/custom-oids' },
                    { label: oid?.oid || 'OID Details', href: '' },
                ]}
            />
            <Container>
                <Widget
                    title="OID Details"
                    busy={isBusy}
                    widgetButtons={buttons}
                    titleSize="large"
                    refreshAction={getFreshOIDDetails}
                    widgetLockName={LockWidgetNameEnum.EntityDetails}
                >
                    <br />

                    <CustomTable headers={detailHeaders} data={detailData} />
                </Widget>
                {showAdditionalProperties && (
                    <Widget title="Additional Properties" titleSize="large">
                        <br />
                        <CustomTable headers={detailHeaders} data={additionalPropertiesData} />
                    </Widget>
                )}
                <Dialog
                    isOpen={confirmDelete}
                    caption="Delete Custom OID"
                    body="You are about to delete Custom OID. Is this what you want to do?"
                    toggle={() => setConfirmDelete(false)}
                    icon="delete"
                    buttons={[
                        { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                        { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    ]}
                />
                <Dialog
                    isOpen={isEditDialogOpen}
                    toggle={handleCloseEditDialog}
                    caption="Edit Custom OID"
                    size="xl"
                    body={<CustomOIDForm oidId={id} onCancel={handleCloseEditDialog} />}
                />
            </Container>
        </div>
    );
}
