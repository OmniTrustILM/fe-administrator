import DetailPageSkeleton from 'components/DetailPageSkeleton';
import AttributeViewer from 'components/Attributes/AttributeViewer';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import TabLayout from 'components/Layout/TabLayout';

import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/cryptographic-keys';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import Select from 'components/Select';

import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { KeyCompromiseReason, KeyState, KeyType, PlatformEnum, Resource } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { dateFormatter } from 'utils/dateUtil';
import CustomAttributeWidget from '../../../Attributes/CustomAttributeWidget';
import CryptographicKeyItem from './CryptographicKeyItem';
import { createWidgetDetailHeaders } from 'utils/widget';
import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';
import { keyWithoutTokenInstanceActionNotes } from './constants';
import CryptographicKeyForm from '../form';

export default function CryptographicKeyDetail() {
    const dispatch = useDispatch();

    const { id, keyItemUuid } = useParams();
    const keysListPath = '/keys';

    const cryptographicKey = useSelector(selectors.cryptographicKey);
    const state = useSelector(selectors.state);
    const isUpdatingKeyUsage = useSelector(selectors.isUpdatingKeyUsage);

    const isDeleting = useSelector(selectors.isDeleting);
    const isEnabling = useSelector(selectors.isEnabling);
    const isDisabling = useSelector(selectors.isDisabling);
    const isCompromising = useSelector(selectors.isBulkCompromising);
    const isDestroying = useSelector(selectors.isBulkDestroying);
    const isFetchingHistory = useSelector(selectors.isFetchingHistory);
    const [selectedTab, setSelectedTab] = useState(0);
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

    const [confirmCompromise, setConfirmCompromise] = useState<boolean>(false);

    const [confirmDestroy, setConfirmDestroy] = useState<boolean>(false);

    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const [compromiseReason, setCompromiseReason] = useState<KeyCompromiseReason>();
    const keyCompromiseReasonEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyCompromiseReason));
    const keyTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyType));
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const isBusy = useMemo(
        () => state.isFetchingDetail || isDeleting || isEnabling || isDisabling || isUpdatingKeyUsage || isCompromising || isDestroying,
        [isDeleting, isEnabling, isDisabling, isUpdatingKeyUsage, isCompromising, isDestroying, state.isFetchingDetail],
    );

    const getFreshCryptographicKeyDetails = useCallback(() => {
        if (!id) return;

        dispatch(actions.getCryptographicKeyDetail({ uuid: id }));
    }, [id, dispatch]);

    useEffect(() => {
        getFreshCryptographicKeyDetails();
    }, [getFreshCryptographicKeyDetails, id]);

    const onEditClick = useCallback(() => {
        if (!cryptographicKey) return;
        setIsEditModalOpen(true);
    }, [cryptographicKey]);

    const handleEditSuccess = useCallback(() => {
        setIsEditModalOpen(false);
        getFreshCryptographicKeyDetails();
    }, [getFreshCryptographicKeyDetails]);

    const onEnableClick = useCallback(() => {
        if (!cryptographicKey) return;
        dispatch(
            actions.enableCryptographicKey({
                keyItemUuid: [],
                uuid: cryptographicKey.uuid,
            }),
        );
    }, [dispatch, cryptographicKey]);

    const onDisableClick = useCallback(() => {
        if (!cryptographicKey) return;
        dispatch(
            actions.disableCryptographicKey({
                keyItemUuid: [],
                uuid: cryptographicKey.uuid,
            }),
        );
    }, [dispatch, cryptographicKey]);

    const onDeleteConfirmed = useCallback(() => {
        if (!cryptographicKey) return;
        dispatch(
            actions.deleteCryptographicKey({
                keyItemUuid: [],
                uuid: cryptographicKey.uuid,
                redirect: keysListPath,
            }),
        );
        setConfirmDelete(false);
    }, [dispatch, cryptographicKey, keysListPath]);

    const onCompromise = useCallback(() => {
        if (!cryptographicKey) return;
        if (!compromiseReason) return;
        dispatch(
            actions.compromiseCryptographicKey({
                request: { reason: compromiseReason },
                uuid: cryptographicKey.uuid,
            }),
        );
        setConfirmCompromise(false);
    }, [dispatch, cryptographicKey, compromiseReason]);

    const onDestroy = useCallback(() => {
        if (!cryptographicKey) return;
        dispatch(
            actions.destroyCryptographicKey({
                keyItemUuid: [],
                uuid: cryptographicKey.uuid,
            }),
        );
        setConfirmDestroy(false);
    }, [dispatch, cryptographicKey]);

    const optionForCompromise = useMemo(() => {
        var options = [];
        if (keyCompromiseReasonEnum) {
            for (const reason in KeyCompromiseReason) {
                const myReason: KeyCompromiseReason = KeyCompromiseReason[reason as keyof typeof KeyCompromiseReason];
                options.push({ value: myReason, label: getEnumLabel(keyCompromiseReasonEnum, myReason) });
            }
        }
        return options;
    }, [keyCompromiseReasonEnum]);

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
                icon: 'check',
                disabled: cryptographicKey?.items.every((item) => item.enabled) ?? false,
                tooltip: 'Enable',
                onClick: () => {
                    onEnableClick();
                },
            },
            {
                icon: 'times',
                disabled: cryptographicKey?.items.every((item) => !item.enabled) ?? false,
                tooltip: 'Disable',
                onClick: () => {
                    onDisableClick();
                },
            },
            {
                icon: 'compromise',
                disabled:
                    cryptographicKey?.items.every(
                        (item) => ![KeyState.PreActive, KeyState.Active, KeyState.Deactivated].includes(item.state),
                    ) ?? false,
                tooltip: 'Compromise',
                onClick: () => {
                    setConfirmCompromise(true);
                },
            },
            {
                icon: 'destroy',
                disabled:
                    cryptographicKey?.items.every(
                        (item) => ![KeyState.PreActive, KeyState.Compromised, KeyState.Deactivated].includes(item.state),
                    ) ?? false,
                tooltip: 'Destroy',
                onClick: () => {
                    setConfirmDestroy(true);
                },
            },
        ],
        [cryptographicKey, onEditClick, onDisableClick, onEnableClick, setConfirmCompromise, setConfirmDestroy],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const associationHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
            },
            {
                id: 'uuid',
                content: 'UUID',
            },
            {
                id: 'resource',
                content: 'Resource',
            },
        ],
        [],
    );

    const associationBody = useMemo(
        () =>
            !cryptographicKey || !cryptographicKey.associations
                ? []
                : cryptographicKey.associations.map((item) => ({
                      id: item.uuid,
                      columns: [
                          item.resource !== Resource.Certificates ? (
                              item.name
                          ) : (
                              <Link to={`/certificates/detail/${item.uuid}`}>{item.name}</Link>
                          ),

                          item.uuid,

                          item.resource,
                      ],
                  })),
        [cryptographicKey],
    );

    const detailData: TableDataRow[] = useMemo(
        () =>
            !cryptographicKey
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', cryptographicKey.uuid],
                      },
                      {
                          id: 'name',
                          columns: ['Name', cryptographicKey.name],
                      },
                      {
                          id: 'description',
                          columns: ['Description', cryptographicKey.description || ''],
                      },
                      {
                          id: 'creationTime',
                          columns: ['Creation Time', dateFormatter(cryptographicKey.creationTime) || ''],
                      },
                      {
                          id: 'tokenName',
                          columns: [
                              'Token Instance Name',
                              cryptographicKey.tokenInstanceUuid ? (
                                  <Link to={`/tokens/detail/${cryptographicKey.tokenInstanceUuid}`}>
                                      {cryptographicKey.tokenInstanceName}
                                  </Link>
                              ) : (
                                  ''
                              ),
                          ],
                      },
                      {
                          id: 'tokenUuid',
                          columns: ['Token Instance UUID', cryptographicKey.tokenInstanceUuid ?? ''],
                      },
                      {
                          id: 'tokenProfileName',
                          columns: [
                              'Token Profile Name',
                              cryptographicKey.tokenInstanceUuid && cryptographicKey.tokenProfileUuid ? (
                                  <Link
                                      to={`/tokenprofiles/detail/${cryptographicKey.tokenInstanceUuid}/${cryptographicKey.tokenProfileUuid}`}
                                  >
                                      {cryptographicKey.tokenProfileName}
                                  </Link>
                              ) : (
                                  ''
                              ),
                          ],
                      },
                      {
                          id: 'tokenProfileUuid',
                          columns: ['Token Profile UUID', cryptographicKey.tokenProfileUuid || 'Unassigned'],
                      },
                      {
                          id: 'owner',
                          columns: [
                              'Owner',
                              cryptographicKey.ownerUuid ? (
                                  <Link to={`/users/detail/${cryptographicKey.ownerUuid}`}>{cryptographicKey.owner ?? 'Unassigned'}</Link>
                              ) : (
                                  cryptographicKey.owner || 'Unassigned'
                              ),
                          ],
                      },
                      {
                          id: 'groupNames',
                          columns: [
                              'Groups',
                              cryptographicKey.groups?.length
                                  ? cryptographicKey.groups.map((group, i) => (
                                        <Fragment key={group.uuid}>
                                            <Link to={`/groups/detail/${group.uuid}`}>{group.name}</Link>
                                            {cryptographicKey?.groups?.length && i !== cryptographicKey.groups.length - 1 ? `, ` : ``}
                                        </Fragment>
                                    ))
                                  : '',
                          ],
                      },
                  ],
        [cryptographicKey],
    );

    const itemTabs = useMemo(() => {
        const keyItems = [...(cryptographicKey?.items ?? [])].sort(
            (a, b) => Object.values(KeyType).indexOf(a.type) - Object.values(KeyType).indexOf(b.type),
        );

        const tabs = keyItems.map((item, i) => ({
            title: getEnumLabel(keyTypeEnum, item.type),
            onClick: () => setSelectedTab(i),
            content: (
                <Widget busy={isBusy || isFetchingHistory} noBorder>
                    <CryptographicKeyItem
                        key={item.uuid}
                        keyItem={item}
                        keyUuid={cryptographicKey!.uuid}
                        tokenInstanceUuid={cryptographicKey!.tokenInstanceUuid}
                        tokenProfileUuid={cryptographicKey!.tokenProfileUuid}
                        totalKeyItems={cryptographicKey!.items.length}
                    />
                </Widget>
            ),
        }));
        return { tabs };
    }, [cryptographicKey, isBusy, isFetchingHistory, keyTypeEnum]);

    useEffect(() => {
        if (cryptographicKey?.items) {
            const keyItems = [...cryptographicKey.items].sort(
                (a, b) => Object.values(KeyType).indexOf(a.type) - Object.values(KeyType).indexOf(b.type),
            );
            const keyTab = keyItems.findIndex((item) => item.uuid === keyItemUuid);
            setSelectedTab(keyTab < 0 ? 0 : keyTab);
        }
    }, [cryptographicKey, keyItemUuid]);

    if (state.isFetchingDetail) {
        return <DetailPageSkeleton layout="split" tabCount={2} rowCount={9} buttonsCount={6} />;
    }

    const breadcrumbItems = [
        { label: `${getEnumLabel(resourceEnum, Resource.Keys)} Inventory`, href: '/keys' },
        { label: cryptographicKey?.name || 'Key Details' },
    ];

    return (
        <div>
            <Breadcrumb items={breadcrumbItems} />
            <Widget widgetLockName={LockWidgetNameEnum.keyDetails} busy={isBusy} noBorder>
                <Container className="md:flex-row">
                    <Widget
                        title="Key Details"
                        busy={isBusy}
                        widgetButtons={buttons}
                        titleSize="large"
                        refreshAction={getFreshCryptographicKeyDetails}
                        lockSize="large"
                        className="w-full md:w-1/2"
                    >
                        <CustomTable headers={detailHeaders} data={detailData} />
                    </Widget>
                    <Container className="w-full md:w-1/2">
                        <Widget title="Key Attributes" titleSize="large">
                            <AttributeViewer attributes={cryptographicKey?.attributes} />
                        </Widget>

                        {cryptographicKey && (
                            <CustomAttributeWidget
                                resource={Resource.Keys}
                                resourceUuid={cryptographicKey.uuid}
                                attributes={cryptographicKey.customAttributes}
                            />
                        )}
                    </Container>
                </Container>
                <Container marginTop>
                    {itemTabs.tabs.length > 0 && <TabLayout tabs={itemTabs.tabs} selectedTab={selectedTab} />}
                    <Widget title="Key Associations" titleSize="large">
                        <CustomTable headers={associationHeaders} data={associationBody} />
                    </Widget>
                </Container>
            </Widget>
            <Dialog
                isOpen={confirmDelete}
                caption="Delete Key"
                size="lg"
                body={
                    <div>
                        <p>You are about to delete the Key. Is this what you want to do?</p>
                        {!cryptographicKey?.tokenInstanceUuid && <p>{keyWithoutTokenInstanceActionNotes.delete}</p>}
                    </div>
                }
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />
            <Dialog
                isOpen={confirmCompromise}
                caption={`Compromise Key`}
                size="md"
                noBorder
                body={
                    <div>
                        <p className="text-center">You are about to mark the Key as compromised. Is this what you want to do?</p>
                        <p className="mt-2 mb-4 text-center">
                            <b>Warning:</b> This action cannot be undone.
                        </p>
                        <Select
                            id="compromiseReason"
                            options={optionForCompromise}
                            value={compromiseReason || ''}
                            onChange={(value) => setCompromiseReason(value as KeyCompromiseReason)}
                        />
                    </div>
                }
                toggle={() => setConfirmCompromise(false)}
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmCompromise(false), body: 'Cancel' },
                    { color: 'danger', onClick: onCompromise, body: 'Yes' },
                ]}
            />
            <Dialog
                isOpen={confirmDestroy}
                caption={`Destroy Key`}
                body={
                    <div>
                        <p>You are about to destroy the Key. Is this what you want to do?</p>
                        {!cryptographicKey?.tokenInstanceUuid && <p>{keyWithoutTokenInstanceActionNotes.destroy}</p>}
                    </div>
                }
                toggle={() => setConfirmDestroy(false)}
                icon="destroy"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDestroy(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDestroy, body: 'Destroy' },
                ]}
            />
            <Dialog
                isOpen={isEditModalOpen}
                caption="Edit Key"
                body={
                    <CryptographicKeyForm
                        keyId={cryptographicKey?.uuid}
                        onSuccess={handleEditSuccess}
                        onCancel={() => setIsEditModalOpen(false)}
                    />
                }
                toggle={() => setIsEditModalOpen(false)}
                size="xl"
                buttons={[]}
            />
        </div>
    );
}
