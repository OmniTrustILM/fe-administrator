import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import StatusBadge from 'components/StatusBadge';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/customAttributes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import CustomAttributeForm from '../form';

import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import Badge from 'components/Badge';
import { PlatformEnum } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';

export default function CustomAttributesList() {
    const dispatch = useDispatch();

    const checkedRows = useSelector(selectors.checkedRows);
    const customAttributes = useSelector(selectors.customAttributes);
    const isFetching = useSelector(selectors.isFetchingList);
    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isBulkEnabling = useSelector(selectors.isBulkEnabling);
    const isBulkDisabling = useSelector(selectors.isBulkDisabling);
    const isUpdating = useSelector(selectors.isUpdating);
    const isBusy = isFetching || isDeleting || isUpdating || isBulkDeleting || isBulkEnabling || isBulkDisabling;

    const attributeContentTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.AttributeContentType));
    const resourcesEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [editingCustomAttributeId, setEditingCustomAttributeId] = useState<string | undefined>(undefined);

    const getFreshData = useCallback(() => {
        dispatch(actions.setCheckedRows({ checkedRows: [] }));
        dispatch(actions.listCustomAttributes({}));
    }, [dispatch]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCancelAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setEditingCustomAttributeId(undefined);
    }, []);

    const handleSuccessAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setEditingCustomAttributeId(undefined);
        getFreshData();
    }, [getFreshData]);

    const onAddClick = useCallback(() => {
        handleOpenAddModal();
    }, [handleOpenAddModal]);

    const onDeleteConfirmed = useCallback(() => {
        dispatch(actions.bulkDeleteCustomAttributes(checkedRows));
        setConfirmDelete(false);
    }, [checkedRows, dispatch]);

    const setCheckedRows = useCallback(
        (rows: (string | number)[]) => {
            dispatch(actions.setCheckedRows({ checkedRows: rows as string[] }));
        },
        [dispatch],
    );

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            { icon: 'plus', disabled: false, tooltip: 'Create', onClick: onAddClick },
            { icon: 'trash', disabled: checkedRows.length === 0, tooltip: 'Delete', onClick: () => setConfirmDelete(true) },
            {
                icon: 'check',
                disabled: checkedRows.length === 0,
                tooltip: 'Enable',
                onClick: () => dispatch(actions.bulkEnableCustomAttributes(checkedRows)),
            },
            {
                icon: 'times',
                disabled: checkedRows.length === 0,
                tooltip: 'Disable',
                onClick: () => dispatch(actions.bulkDisableCustomAttributes(checkedRows)),
            },
        ],
        [checkedRows, onAddClick, dispatch],
    );

    const customAttributesTableHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
                sortable: true,
                sort: 'asc',
                width: '40%',
            },
            {
                id: 'version',
                content: 'Ver',
                sortable: true,
                width: '5%',
            },
            {
                id: 'status',
                content: 'Status',
                sortable: true,
                width: '5%',
            },
            {
                id: 'contentType',
                content: 'Content Type',
                sortable: true,
                width: '5%',
            },
            {
                id: 'description',
                content: 'Description',
                sortable: true,
                width: '20%',
            },
            {
                id: 'resources',
                content: 'Resources',
                sortable: false,
                width: '30%',
            },
        ],
        [],
    );

    const customAttributesTableData: TableDataRow[] = useMemo(
        () =>
            customAttributes.map((customAttribute) => ({
                id: customAttribute.uuid,
                columns: [
                    <Link key={customAttribute.uuid} to={`./detail/${customAttribute.uuid}`}>
                        {customAttribute.name}
                    </Link>,
                    customAttribute.version || '',
                    <StatusBadge enabled={customAttribute.enabled} />,
                    getEnumLabel(attributeContentTypeEnum, customAttribute.contentType),
                    customAttribute.description,
                    <>
                        {customAttribute.resources.map((r, i) => (
                            <Badge style={{ margin: '1px' }} color="secondary" key={i}>
                                {getEnumLabel(resourcesEnum, r)}
                            </Badge>
                        ))}
                    </>,
                ],
            })),
        [customAttributes, attributeContentTypeEnum, resourcesEnum],
    );

    return (
        <>
            <Widget
                title="List of Custom Attributes"
                busy={isBusy && !(isFetching && customAttributes.length === 0)}
                widgetLockName={LockWidgetNameEnum.ListOfCustomAttributes}
                widgetButtons={buttons}
                titleSize="large"
                refreshAction={getFreshData}
            >
                <CustomTable
                    headers={customAttributesTableHeaders}
                    data={customAttributesTableData}
                    onCheckedRowsChanged={setCheckedRows}
                    canSearch={true}
                    hasCheckboxes={true}
                    hasPagination={true}
                    isLoading={isFetching && customAttributes.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={`Delete ${checkedRows.length > 1 ? 'Custom Attributes' : 'a Custom Attribute'}`}
                body={`You are about to delete ${
                    checkedRows.length > 1 ? 'Custom Attributes' : 'a Custom Attribute'
                }. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />

            <Dialog
                isOpen={isAddModalOpen || !!editingCustomAttributeId}
                toggle={handleCancelAddModal}
                caption={editingCustomAttributeId ? 'Edit Custom Attribute' : 'Create Custom Attribute'}
                size="xl"
                body={
                    <CustomAttributeForm
                        customAttributeId={editingCustomAttributeId}
                        onCancel={handleCancelAddModal}
                        onSuccess={handleSuccessAddModal}
                    />
                }
            />
        </>
    );
}
