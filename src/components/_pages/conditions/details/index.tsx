import DetailPageSkeleton from 'components/DetailPageSkeleton';
import ConditionAndSetFieldExecutionItemsViewer from 'components/ConditionAndSetFieldExecutionItemsViewer';
import CustomTable, { type TableDataRow } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import Breadcrumb from 'components/Breadcrumb';
import Widget from 'components/Widget';
import EditNameDescriptionDialog from 'components/EditNameDescriptionDialog';
import { propertyValueActionsHeaders } from 'utils/automationDetailUtils';
import { getEditAndDeleteWidgetButtons } from 'utils/widget';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as rulesActions, selectors as rulesSelectors } from 'ducks/rules';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Container from 'components/Container';
import { PlatformEnum, Resource } from 'types/openapi';
import { EnumValueDescription } from 'components/EnumDescription';

const ConditionDetails = () => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const conditionTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ConditionType));
    const conditionDetails = useSelector(rulesSelectors.conditionDetails);
    const isFetchingConditionGroup = useSelector(rulesSelectors.isFetchingConditionDetails);
    const isUpdatingGroupDetails = useSelector(rulesSelectors.isUpdatingCondition);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const isBusy = useMemo(() => isFetchingConditionGroup || isUpdatingGroupDetails, [isFetchingConditionGroup, isUpdatingGroupDetails]);

    const getFreshDetails = useCallback(() => {
        if (!id) return;
        dispatch(rulesActions.getCondition({ conditionUuid: id }));
    }, [id, dispatch]);

    useEffect(() => {
        getFreshDetails();
    }, [getFreshDetails]);

    const onDeleteConfirmed = useCallback(() => {
        if (!id) return;
        dispatch(rulesActions.deleteCondition({ conditionUuid: id }));
        setConfirmDelete(false);
    }, [dispatch, id]);

    const onEditSubmit = useCallback(
        ({ name, description }: { name: string; description: string }) => {
            if (!id) return;
            dispatch(
                rulesActions.updateCondition({
                    conditionUuid: id,
                    condition: {
                        name,
                        description,
                        items: conditionDetails?.items || [],
                    },
                }),
            );
            setIsEditOpen(false);
        },
        [dispatch, id, conditionDetails],
    );

    const buttons = useMemo(() => getEditAndDeleteWidgetButtons(() => setIsEditOpen(true), setConfirmDelete), []);
    const tableHeader = propertyValueActionsHeaders;

    const conditionGroupsDetailData: TableDataRow[] = useMemo(
        () =>
            !conditionDetails || isFetchingConditionGroup
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', conditionDetails.uuid, ''],
                      },
                      {
                          id: 'name',
                          columns: ['Name', conditionDetails.name, ''],
                      },
                      {
                          id: 'type',
                          columns: [
                              'Type',
                              <span key="type" className="inline-flex items-center gap-1">
                                  {getEnumLabel(conditionTypeEnum, conditionDetails.type)}
                                  <EnumValueDescription platformEnum={PlatformEnum.ConditionType} value={conditionDetails.type} />
                              </span>,
                              '',
                          ],
                      },
                      {
                          id: 'resource',
                          columns: [
                              'Resource',
                              <span key="resource" className="inline-flex items-center gap-1">
                                  {getEnumLabel(resourceTypeEnum, conditionDetails.resource)}
                                  <EnumValueDescription platformEnum={PlatformEnum.Resource} value={conditionDetails.resource} />
                              </span>,
                              '',
                          ],
                      },
                      {
                          id: 'description',
                          columns: ['Description', conditionDetails.description || '', ''],
                      },
                  ],
        [conditionDetails, conditionTypeEnum, resourceTypeEnum, isFetchingConditionGroup],
    );

    if (isFetchingConditionGroup && !conditionDetails) {
        return <DetailPageSkeleton layout="simple" buttonsCount={1} />;
    }

    return (
        <Container>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceTypeEnum, Resource.Conditions)} Inventory`, href: '/rules?tab=conditions' },
                    { label: conditionDetails?.name || 'Condition Details', href: '' },
                ]}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Widget
                        refreshAction={getFreshDetails}
                        busy={isBusy}
                        title="Condition Details"
                        titleSize="large"
                        widgetButtons={buttons}
                    >
                        <CustomTable data={conditionGroupsDetailData} headers={tableHeader} />
                    </Widget>
                </div>
            </div>
            <div>
                {conditionDetails?.resource && (
                    <ConditionAndSetFieldExecutionItemsViewer resource={conditionDetails.resource} formType="conditionItems" />
                )}
            </div>
            <EditNameDescriptionDialog
                isOpen={isEditOpen}
                caption="Edit Condition"
                name={conditionDetails?.name || ''}
                description={conditionDetails?.description || ''}
                isUpdating={isUpdatingGroupDetails}
                onClose={() => setIsEditOpen(false)}
                onSubmit={onEditSubmit}
            />
            <Dialog
                isOpen={confirmDelete}
                caption={`Delete a Condition`}
                body={`You are about to delete a Condition. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />
        </Container>
    );
};

export default ConditionDetails;
