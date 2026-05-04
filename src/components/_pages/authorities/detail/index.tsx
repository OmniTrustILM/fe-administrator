import AttributeViewer from 'components/Attributes/AttributeViewer';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';

import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/authorities';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router';
import Label from 'components/Label';
import { LockWidgetNameEnum } from 'types/user-interface';
import { PlatformEnum, Resource } from '../../../../types/openapi';
import CustomAttributeWidget from '../../../Attributes/CustomAttributeWidget';
import { getEditAndDeleteWidgetButtons, createWidgetDetailHeaders } from 'utils/widget';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';
import DetailPageSkeleton from 'components/DetailPageSkeleton';

export default function AuthorityDetail() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { id } = useParams();

    const authority = useSelector(selectors.authority);

    const isFetching = useSelector(selectors.isFetchingDetail);
    const isDeleting = useSelector(selectors.isDeleting);
    const _isUpdating = useSelector(selectors.isUpdating);

    const deleteErrorMessage = useSelector(selectors.deleteErrorMessage);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

    const isBusy = useMemo(() => isFetching || isDeleting, [isFetching, isDeleting]);

    const getFreshAuthorityDetails = useCallback(() => {
        if (!id) return;
        dispatch(actions.resetState());
        dispatch(actions.getAuthorityDetail({ uuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshAuthorityDetails();
    }, [getFreshAuthorityDetails, id]);

    const onEditClick = useCallback(() => {
        if (!authority) return;
        navigate(`/authorities/edit/${authority.uuid}`);
    }, [authority, navigate]);

    const onDeleteConfirmed = useCallback(() => {
        if (!authority) return;

        dispatch(actions.deleteAuthority({ uuid: authority.uuid }));
        setConfirmDelete(false);
    }, [authority, dispatch]);

    const onForceDeleteAuthority = useCallback(() => {
        if (!authority) return;
        dispatch(actions.clearDeleteErrorMessages());
        dispatch(actions.bulkForceDeleteAuthority({ uuids: [authority.uuid], redirect: `../authorities` }));
    }, [authority, dispatch]);

    const buttons: WidgetButtonProps[] = useMemo(() => getEditAndDeleteWidgetButtons(onEditClick, setConfirmDelete), [onEditClick]);

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            !authority
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', authority.uuid],
                      },
                      {
                          id: 'name',
                          columns: ['Name', authority.name],
                      },
                      {
                          id: 'kind',
                          columns: ['Kind', authority.kind],
                      },
                      {
                          id: 'authorityProviderUUID',
                          columns: ['Authority Provider UUID', authority?.connectorUuid ?? ''],
                      },
                      {
                          id: 'authorityProviderName',
                          columns: [
                              'Authority Provider Name',
                              authority.connectorUuid ? (
                                  <Link to={`../../connectors/detail/${authority.connectorUuid}`}>{authority.connectorName}</Link>
                              ) : (
                                  ''
                              ),
                          ],
                      },
                  ],
        [authority],
    );

    if (isFetching) {
        return <DetailPageSkeleton layout="simple" buttonsCount={3} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Authorities)} Inventory`, href: '/authorities' },
                    { label: authority?.name || 'Certification Authority Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.CertificationAuthorityDetails} busy={isBusy} noBorder>
                <Container>
                    <Widget
                        title="Certification Authority Details"
                        widgetButtons={buttons}
                        titleSize="large"
                        refreshAction={getFreshAuthorityDetails}
                    >
                        <CustomTable headers={detailHeaders} data={detailData} />
                    </Widget>

                    <Widget title="Attributes" titleSize="large">
                        <Label>Certification Authority Attributes</Label>
                        <AttributeViewer attributes={authority?.attributes} />
                    </Widget>

                    {authority && (
                        <CustomAttributeWidget
                            resource={Resource.Authorities}
                            resourceUuid={authority.uuid}
                            attributes={authority.customAttributes}
                        />
                    )}
                </Container>
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete Certification Authority"
                body="You are about to delete Authority. If you continue, connectors
                  related to the authority will fail. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={deleteErrorMessage !== ''}
                caption="Delete Authority"
                body={
                    <>
                        Failed to delete the Authority Instance as it has dependent objects. Please find the details below:
                        <br />
                        <br />
                        {deleteErrorMessage}
                    </>
                }
                toggle={() => dispatch(actions.clearDeleteErrorMessages())}
                buttons={[
                    { color: 'danger', onClick: onForceDeleteAuthority, body: 'Force' },
                    {
                        color: 'secondary',
                        variant: 'outline',
                        onClick: () => dispatch(actions.clearDeleteErrorMessages()),
                        body: 'Cancel',
                    },
                ]}
            />
        </div>
    );
}
