import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import StatusBadge from 'components/StatusBadge';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { actions, selectors } from 'ducks/customAttributes';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { useCallback, useEffect, useMemo, useState, Fragment } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Badge from 'components/Badge';
import { PlatformEnum, Resource } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { getAttributeContent } from 'utils/attributes/attributes';
import { useCopyToClipboard } from 'utils/common-hooks';
import { createWidgetDetailHeaders } from 'utils/widget';
import Breadcrumb from 'components/Breadcrumb';
import { Copy } from 'lucide-react';
import CustomAttributeForm from '../form';
import Button from 'components/Button';
import DetailPageSkeleton from 'components/DetailPageSkeleton';

export default function CustomAttributeDetail() {
    const dispatch = useDispatch();

    const { id } = useParams();

    const customAttribute = useSelector(selectors.customAttribute);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isEnabling = useSelector(selectors.isEnabling);
    const isDisabling = useSelector(selectors.isDisabling);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const attributeContentTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.AttributeContentType));
    const protectionLevelEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ProtectionLevel));

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const isBusy = useMemo(() => isFetchingDetail || isEnabling || isDisabling, [isFetchingDetail, isEnabling, isDisabling]);

    const getFreshCustomAttribute = useCallback(() => {
        if (!id) return;
        dispatch(actions.getCustomAttribute(id));
    }, [dispatch, id]);

    useEffect(() => {
        if (!customAttribute || id !== customAttribute.uuid) {
            getFreshCustomAttribute();
        }
    }, [getFreshCustomAttribute, id, customAttribute]);

    const handleOpenEditModal = useCallback(() => {
        setIsEditModalOpen(true);
    }, []);

    const handleCancelEditModal = useCallback(() => {
        setIsEditModalOpen(false);
    }, []);

    const handleSuccessEditModal = useCallback(() => {
        setIsEditModalOpen(false);
        getFreshCustomAttribute();
    }, [getFreshCustomAttribute]);

    const onEditClick = useCallback(() => {
        handleOpenEditModal();
    }, [handleOpenEditModal]);

    const onDeleteConfirmed = useCallback(() => {
        if (!customAttribute) return;
        dispatch(actions.deleteCustomAttribute(customAttribute.uuid));
        setConfirmDelete(false);
    }, [customAttribute, dispatch]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'pencil',
                disabled: false,
                tooltip: 'Edit',
                onClick: () => {
                    onEditClick();
                },
            },
            {
                icon: 'trash',
                disabled: false,
                tooltip: 'Delete',
                onClick: () => {
                    setConfirmDelete(true);
                },
            },
            {
                icon: customAttribute?.enabled ? 'times' : 'check',
                disabled: !customAttribute || isEnabling || isDisabling,
                tooltip: customAttribute?.enabled ? 'Disable' : 'Enable',
                onClick: () =>
                    customAttribute?.enabled
                        ? dispatch(actions.disableCustomAttribute(customAttribute?.uuid))
                        : customAttribute
                          ? dispatch(actions.enableCustomAttribute(customAttribute?.uuid))
                          : {},
            },
        ],
        [onEditClick, customAttribute, dispatch, isDisabling, isEnabling],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const getBadge = (property: boolean | undefined, label: string) =>
        property ? (
            <Badge style={{ margin: '1px' }} color="success">
                {label}
            </Badge>
        ) : (
            <></>
        );

    const copyToClipboard = useCopyToClipboard();

    const onContentCopyClick = useCallback(() => {
        if (!customAttribute) return;
        let textToCopy = '';

        if (!customAttribute?.content?.length) return;
        if (customAttribute.content.length > 1) textToCopy = customAttribute.content?.map((content) => content.data).join(', ');
        if (customAttribute.content.length === 1) textToCopy = customAttribute.content[0].data.toString();

        copyToClipboard(textToCopy, 'Custom Attribute content was copied to clipboard', 'Failed to Custom Attribute content to clipboard');
    }, [customAttribute, copyToClipboard]);

    const detailData: TableDataRow[] = useMemo(
        () =>
            !customAttribute
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', customAttribute.uuid],
                      },
                      {
                          id: 'version',
                          columns: ['Version', customAttribute.version || ''],
                      },
                      {
                          id: 'name',
                          columns: ['Name', customAttribute.name],
                      },
                      {
                          id: 'label',
                          columns: ['Label', customAttribute.label],
                      },
                      {
                          id: 'description',
                          columns: ['Description', customAttribute.description],
                      },
                      {
                          id: 'group',
                          columns: ['Group', customAttribute.group ?? ''],
                      },
                      {
                          id: 'resources',
                          columns: [
                              'Resources',
                              customAttribute.resources?.map((r, i) => (
                                  <Badge key={i} style={{ margin: '1px' }} color="secondary">
                                      {getEnumLabel(resourceEnum, r)}
                                  </Badge>
                              )) ?? '',
                          ],
                      },
                      {
                          id: 'contentType',
                          columns: [
                              'Content Type',
                              getEnumLabel(attributeContentTypeEnum, customAttribute.contentType) || customAttribute.contentType,
                          ],
                      },
                      ...(customAttribute.list
                          ? [
                                {
                                    id: 'extensibleList',
                                    columns: ['Extensible List', customAttribute.extensibleList ? 'True' : 'False'],
                                },
                            ]
                          : []),
                      {
                          id: 'protectionLevel',
                          columns: [
                              'Protection Level',
                              customAttribute.protectionLevel != null
                                  ? getEnumLabel(protectionLevelEnum, customAttribute.protectionLevel)
                                  : '—',
                          ],
                      },
                      {
                          id: 'content',
                          columns: [
                              'Content',
                              <div key="content-actions" className="flex items-center gap-2">
                                  {getAttributeContent(customAttribute.contentType, customAttribute.content)}
                                  {customAttribute?.content?.length ? (
                                      <Button variant="transparent" onClick={onContentCopyClick}>
                                          {' '}
                                          <Copy size={16} />{' '}
                                      </Button>
                                  ) : (
                                      <> </>
                                  )}
                              </div>,
                          ],
                      },
                      {
                          id: 'properties',
                          columns: [
                              'Properties',
                              <Fragment key="properties-badges">
                                  <StatusBadge style={{ margin: '1px' }} enabled={customAttribute.enabled} />
                                  {getBadge(customAttribute.visible, 'Visible')}
                                  {getBadge(customAttribute.required, 'Required')}
                                  {getBadge(customAttribute.readOnly, 'Read Only')}
                                  {getBadge(customAttribute.list, 'List')}
                                  {getBadge(customAttribute.multiSelect, 'Multi Select')}
                              </Fragment>,
                          ],
                      },
                  ],
        [customAttribute, attributeContentTypeEnum, resourceEnum, protectionLevelEnum, onContentCopyClick],
    );

    if (isFetchingDetail) {
        return <DetailPageSkeleton layout="simple" buttonsCount={2} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.CustomAttributes)} Inventory`, href: '/customattributes' },
                    { label: customAttribute?.name || 'Custom Attribute Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.CustomAttributeDetails} busy={isBusy} noBorder>
                <Widget title="Custom Attribute Details" widgetButtons={buttons} titleSize="large" refreshAction={getFreshCustomAttribute}>
                    <CustomTable headers={detailHeaders} data={detailData} />
                </Widget>
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete Custom Attribute"
                body="You are about to delete a Custom Attribute. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />

            <Dialog
                isOpen={isEditModalOpen}
                toggle={handleCancelEditModal}
                caption="Edit Custom Attribute"
                size="xl"
                body={
                    <CustomAttributeForm
                        customAttributeId={customAttribute?.uuid}
                        onCancel={handleCancelEditModal}
                        onSuccess={handleSuccessEditModal}
                    />
                }
            />
        </div>
    );
}
