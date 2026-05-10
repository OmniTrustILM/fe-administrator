import DetailPageSkeleton from 'components/DetailPageSkeleton';
import ConditionAndSetFieldExecutionItemsViewer from 'components/ConditionAndSetFieldExecutionItemsViewer';
import CustomTable, { type TableDataRow } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import Breadcrumb from 'components/Breadcrumb';
import Widget from 'components/Widget';
import { propertyValueActionsHeaders, createDeleteButton } from 'utils/automationDetailUtils';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as rulesActions, selectors as rulesSelectors } from 'ducks/rules';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Button from 'components/Button';
import Container from 'components/Container';
import TextInput from 'components/TextInput';
import { PlatformEnum, Resource } from 'types/openapi';
import { Check, X } from 'lucide-react';
import EditIcon from 'components/icons/EditIcon';

const ConditionDetails = () => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const conditionTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ConditionType));
    const conditionDetails = useSelector(rulesSelectors.conditionDetails);
    const isFetchingConditionGroup = useSelector(rulesSelectors.isFetchingConditionDetails);
    const isUpdatingGroupDetails = useSelector(rulesSelectors.isUpdatingCondition);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [updateDescriptionEditEnable, setUpdateDescriptionEditEnable] = useState<boolean>(false);
    const [updatedDescription, setUpdatedDescription] = useState('');

    const isBusy = useMemo(() => isFetchingConditionGroup || isUpdatingGroupDetails, [isFetchingConditionGroup, isUpdatingGroupDetails]);

    useEffect(() => {
        if (!conditionDetails?.description || conditionDetails.uuid !== id) return;
        setUpdatedDescription(conditionDetails.description);
    }, [conditionDetails, id]);

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

    const onUpdateDescriptionConfirmed = useCallback(() => {
        if (!id || !updateDescriptionEditEnable) return;
        if (updatedDescription !== conditionDetails?.description) {
            dispatch(
                rulesActions.updateCondition({
                    conditionUuid: id,
                    condition: {
                        description: updatedDescription,
                        items: conditionDetails?.items || [],
                    },
                }),
            );
        }
        setUpdateDescriptionEditEnable(false);
    }, [dispatch, id, conditionDetails, updatedDescription, updateDescriptionEditEnable]);

    const buttons = useMemo(() => createDeleteButton(() => setConfirmDelete(true)), []);
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
                          columns: ['Type', getEnumLabel(conditionTypeEnum, conditionDetails.type), ''],
                      },
                      {
                          id: 'resource',
                          columns: ['Resource', getEnumLabel(resourceTypeEnum, conditionDetails.resource), ''],
                      },
                      {
                          id: 'description',
                          columns: [
                              'Description',
                              updateDescriptionEditEnable ? (
                                  <TextInput
                                      key="desc-input"
                                      onChange={(value) => setUpdatedDescription(value)}
                                      value={updatedDescription}
                                      placeholder="Enter Description"
                                  />
                              ) : (
                                  conditionDetails.description || ''
                              ),
                              <div key="desc-actions">
                                  {updateDescriptionEditEnable ? (
                                      <div className="flex gap-2">
                                          <Button
                                              variant="transparent"
                                              color="secondary"
                                              title="Update Description"
                                              onClick={onUpdateDescriptionConfirmed}
                                              disabled={
                                                  isUpdatingGroupDetails ||
                                                  updatedDescription === conditionDetails.description ||
                                                  updatedDescription === ''
                                              }
                                          >
                                              <Check size={16} />
                                          </Button>
                                          <Button
                                              variant="transparent"
                                              color="danger"
                                              title="Cancel"
                                              onClick={() => {
                                                  setUpdateDescriptionEditEnable(false);
                                                  setUpdatedDescription(conditionDetails?.description || '');
                                              }}
                                              disabled={isUpdatingGroupDetails}
                                          >
                                              <X size={16} />
                                          </Button>
                                      </div>
                                  ) : (
                                      <Button
                                          variant="transparent"
                                          color="secondary"
                                          title="Update Description"
                                          onClick={() => {
                                              setUpdateDescriptionEditEnable(true);
                                          }}
                                          disabled={isUpdatingGroupDetails}
                                      >
                                          <EditIcon size={16} />
                                      </Button>
                                  )}
                              </div>,
                          ],
                      },
                  ],
        [
            conditionDetails,
            conditionTypeEnum,
            resourceTypeEnum,
            setUpdateDescriptionEditEnable,
            updateDescriptionEditEnable,
            onUpdateDescriptionConfirmed,
            isUpdatingGroupDetails,
            updatedDescription,
            isFetchingConditionGroup,
        ],
    );

    if (isFetchingConditionGroup && !conditionDetails) {
        return <DetailPageSkeleton layout="simple" buttonsCount={1} />;
    }

    return (
        <Container>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceTypeEnum, Resource.Conditions)} Inventory`, href: '/rules/1' },
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
