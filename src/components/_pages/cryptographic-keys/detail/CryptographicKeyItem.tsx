import AttributeViewer, { ATTRIBUTE_VIEWER_TYPE } from 'components/Attributes/AttributeViewer';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import StatusBadge from 'components/StatusBadge';
import Widget from 'components/Widget';

import WidgetButtons, { type WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/cryptographic-keys';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'components/Select';

import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import Badge from 'components/Badge';
import type { CryptographicKeyHistoryModel, CryptographicKeyItemDetailResponseModel } from 'types/cryptographic-keys';
import { KeyCompromiseReason, KeyState, KeyUsage, PlatformEnum } from 'types/openapi';
import { dateFormatter } from 'utils/dateUtil';
import KeyStateBadge from '../KeyStateBadge';
import KeyStatus from '../KeyStatus';
import KeyUsageSelect from '../KeyUsageSelect';
import SignVerifyData from './SignVerifyData';
import { composeValidators, validateAlphaNumericWithSpecialChars, validateRequired } from 'utils/validators';
import EditableTableCell from 'components/CustomTable/EditableTableCell';
import { keyWithoutTokenInstanceActionNotes } from './constants';
import { createWidgetDetailHeaders } from 'utils/widget';
import Button from 'components/Button';
import { Info } from 'lucide-react';
import Container from 'components/Container';

type Props = Readonly<{
    keyUuid: string;
    tokenInstanceUuid?: string;
    tokenProfileUuid?: string;
    keyItem: CryptographicKeyItemDetailResponseModel;
    totalKeyItems: number;
}>;

export default function CryptographicKeyItem({ keyUuid, tokenInstanceUuid, tokenProfileUuid, keyItem, totalKeyItems }: Props) {
    const dispatch = useDispatch();

    const isUpdatingKeyItem = useSelector(selectors.isUpdatingKeyItem);

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

    const [confirmCompromise, setConfirmCompromise] = useState<boolean>(false);

    const [confirmDestroy, setConfirmDestroy] = useState<boolean>(false);

    const [signData, setSignData] = useState<boolean>(false);

    const [verifyData, setVerifyData] = useState<boolean>(false);

    const history = useSelector(selectors.keyHistory);

    const [keyHistory, setKeyHistory] = useState<CryptographicKeyHistoryModel[]>([]);

    const [currentInfoId, setCurrentInfoId] = useState('');

    const [compromiseReason, setCompromiseReason] = useState<KeyCompromiseReason>();

    const [keyUsageUpdate, setKeyUsageUpdate] = useState<boolean>(false);

    const [keyUsages, setKeyUsages] = useState<KeyUsage[]>([]);

    const [displayKeyData, setDisplayKeyData] = useState<boolean>(false);
    const keyUsageEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyUsage));
    const keyTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyType));
    const keyCompromiseReasonEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyCompromiseReason));

    const getFreshHistory = useCallback(() => {
        if (!keyItem) return;
        dispatch(actions.getHistory({ keyItemUuid: keyItem.uuid, keyUuid: keyUuid }));
    }, [dispatch, keyUuid, keyItem]);

    useEffect(() => {
        getFreshHistory();
    }, [getFreshHistory, keyUuid]);

    useEffect(() => {
        if (history) {
            setKeyHistory(history.find((item) => item.uuid === keyItem.uuid)?.history || []);
        }
    }, [history, keyItem.uuid]);

    useEffect(() => {
        setKeyUsages(keyItem?.usage || []);
    }, [keyUsageUpdate, keyItem?.usage]);

    const onEnableClick = useCallback(() => {
        if (!keyItem) return;
        dispatch(
            actions.enableCryptographicKey({
                keyItemUuid: [keyItem.uuid],
                uuid: keyUuid,
            }),
        );
    }, [dispatch, keyItem, keyUuid]);

    const onDisableClick = useCallback(() => {
        if (!keyItem) return;
        dispatch(
            actions.disableCryptographicKey({
                keyItemUuid: [keyItem.uuid],
                uuid: keyUuid,
            }),
        );
    }, [dispatch, keyItem, keyUuid]);

    const onUpdateKeyUsageConfirmed = useCallback(() => {
        if (!keyItem) return;
        dispatch(
            actions.updateKeyUsage({
                uuid: keyUuid,
                usage: { usage: keyUsages, uuids: [keyItem.uuid] },
            }),
        );
        setKeyUsageUpdate(false);
    }, [dispatch, keyUsages, keyItem, keyUuid]);

    const onDeleteConfirmed = useCallback(() => {
        if (!keyItem) return;
        dispatch(
            actions.deleteCryptographicKey({
                keyItemUuid: [keyItem.uuid],
                uuid: keyUuid,
                redirect: totalKeyItems === 1 ? '/keys' : undefined,
            }),
        );
        setConfirmDelete(false);
    }, [dispatch, keyItem, keyUuid, totalKeyItems]);

    const onCompromise = useCallback(() => {
        if (!keyItem) return;
        if (!compromiseReason) return;
        dispatch(
            actions.compromiseCryptographicKey({
                request: {
                    uuids: [keyItem.uuid],
                    reason: compromiseReason,
                },
                uuid: keyUuid,
            }),
        );
        setConfirmCompromise(false);
    }, [dispatch, keyItem, keyUuid, compromiseReason]);

    const onDestroy = useCallback(() => {
        dispatch(
            actions.destroyCryptographicKey({
                keyItemUuid: [keyItem.uuid],
                uuid: keyUuid,
            }),
        );
        setConfirmDestroy(false);
    }, [dispatch, keyItem, keyUuid]);

    const onEditName = useCallback(
        (newKeyItemName: string) => {
            if (!keyItem) return;
            if (keyItem.name === newKeyItemName) return;
            dispatch(
                actions.updateCryptographicKeyItem({
                    uuid: keyUuid,
                    keyItemUuid: keyItem.uuid,
                    cryptographicKeyItemEditRequest: {
                        name: newKeyItemName,
                    },
                }),
            );
        },
        [dispatch, keyItem, keyUuid],
    );

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                id: 'delete',
                icon: 'trash',
                disabled: false,
                tooltip: 'Delete',
                onClick: () => {
                    setConfirmDelete(true);
                },
            },
            {
                id: 'enable',
                icon: 'check',
                disabled: keyItem.enabled,
                tooltip: 'Enable',
                onClick: () => {
                    onEnableClick();
                },
            },
            {
                id: 'disable',
                icon: 'times',
                disabled: !keyItem.enabled,
                tooltip: 'Disable',
                onClick: () => {
                    onDisableClick();
                },
            },
            {
                id: 'key',
                icon: 'key',
                disabled: false,
                tooltip: 'Update Key Usage',
                onClick: () => {
                    setKeyUsageUpdate(true);
                },
            },
            {
                id: 'compromise',
                icon: 'compromise',
                disabled: ![KeyState.PreActive, KeyState.Active, KeyState.Deactivated].includes(keyItem.state),
                tooltip: 'Compromise',
                onClick: () => {
                    setConfirmCompromise(true);
                },
            },
            {
                id: 'destroy',
                icon: 'destroy',
                disabled: ![KeyState.PreActive, KeyState.Compromised, KeyState.Deactivated].includes(keyItem.state),
                tooltip: 'Destroy',
                onClick: () => {
                    setConfirmDestroy(true);
                },
            },
            {
                id: 'sign',
                icon: 'sign',
                disabled:
                    keyItem.state !== KeyState.Active || !keyItem.enabled || !keyItem.usage?.includes(KeyUsage.Sign) || !tokenInstanceUuid,
                tooltip: 'Sign',
                onClick: () => {
                    setSignData(true);
                },
            },
            {
                id: 'verify',
                icon: 'verify',
                disabled:
                    keyItem.state !== KeyState.Active ||
                    !keyItem.enabled ||
                    !keyItem.usage?.includes(KeyUsage.Verify) ||
                    !tokenInstanceUuid,
                tooltip: 'Verify',
                onClick: () => {
                    setVerifyData(true);
                },
            },
        ],
        [
            onDisableClick,
            onEnableClick,
            setConfirmCompromise,
            setConfirmDestroy,
            keyItem.enabled,
            keyItem.state,
            keyItem.usage,
            tokenInstanceUuid,
        ],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            keyItem
                ? [
                      {
                          id: 'uuid',
                          columns: ['UUID', keyItem.uuid],
                      },
                      {
                          id: 'name',
                          columns: [
                              'Name',
                              <EditableTableCell
                                  key="name"
                                  value={keyItem.name}
                                  onSave={(newKeyItemName) => onEditName(newKeyItemName)}
                                  busy={isUpdatingKeyItem}
                                  formProps={{
                                      validate: composeValidators(validateRequired(), validateAlphaNumericWithSpecialChars()),
                                  }}
                              />,
                          ],
                      },
                      {
                          id: 'Type',
                          columns: ['Type', getEnumLabel(keyTypeEnum, keyItem.type)],
                      },
                      {
                          id: 'keyAlgorithm',
                          columns: ['Key Algorithm', keyItem.keyAlgorithm],
                      },
                      {
                          id: 'format',
                          columns: [
                              'Key Format',
                              <div key="format-actions" className="flex items-center gap-2">
                                  {keyItem.format}
                                  <Button variant="transparent" onClick={() => setDisplayKeyData(true)} title="Show Additional Information">
                                      <Info size={16} />
                                  </Button>
                              </div>,
                          ],
                      },
                      {
                          id: 'Usages',
                          columns: [
                              'Key Usages',
                              <Container className="flex-row" gap={1}>
                                  {keyItem.usage?.map((usage) => (
                                      <Badge key={usage} color="secondary">
                                          {usage}
                                      </Badge>
                                  )) ?? 'None'}
                              </Container>,
                          ],
                      },
                      {
                          id: 'enabled',
                          columns: ['Enabled', <StatusBadge key="enabled" enabled={keyItem!.enabled} />],
                      },
                      {
                          id: 'state',
                          columns: [
                              'State',
                              keyItem.reason ? (
                                  <>
                                      <KeyStateBadge state={keyItem.state} />
                                      &nbsp;{getEnumLabel(keyCompromiseReasonEnum, keyItem.reason)}
                                  </>
                              ) : (
                                  <KeyStateBadge state={keyItem.state} />
                              ),
                          ],
                      },
                  ]
                : [],
        [keyItem, keyTypeEnum, isUpdatingKeyItem, onEditName, keyCompromiseReasonEnum],
    );

    const historyHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'time',
                content: 'Time',
            },
            {
                id: 'user',
                content: 'User',
            },
            {
                id: 'event',
                content: 'Event',
            },
            {
                id: 'status',
                content: 'Status',
            },
            {
                id: 'message',
                content: 'Message',
            },
            {
                id: 'additionalMessage',
                content: 'Additional Message',
            },
        ],
        [],
    );

    const optionForCompromise = () => {
        const options = [];
        for (const reason in KeyCompromiseReason) {
            const myReason: KeyCompromiseReason = KeyCompromiseReason[reason as keyof typeof KeyCompromiseReason];
            options.push({ value: myReason, label: getEnumLabel(keyCompromiseReasonEnum, myReason) });
        }
        return options;
    };

    const historyEntry: TableDataRow[] = useMemo(
        () =>
            keyHistory
                ? keyHistory.map((history) => ({
                      id: history.uuid,
                      columns: [
                          <span style={{ whiteSpace: 'nowrap' }}>{dateFormatter(history.created)}</span>,

                          history.createdBy,

                          history.event,

                          <KeyStatus status={history.status} />,

                          <div style={{ wordBreak: 'break-all' }}>{history.message}</div>,

                          history.additionalInformation ? (
                              <Button
                                  variant="transparent"
                                  onClick={() => setCurrentInfoId(history.uuid)}
                                  title="Show Additional Information"
                              >
                                  <Info size={16} />
                              </Button>
                          ) : (
                              ''
                          ),
                      ],
                  }))
                : [],
        [keyHistory],
    );

    const existingUsages = () => {
        if (!keyItem) return [];
        return keyItem.usage?.map((usage) => {
            return { value: usage, label: usage.charAt(0).toUpperCase() + usage.slice(1).toLowerCase() };
        });
    };

    const additionalInfoEntry = (): any => {
        const returnList = [];

        if (!currentInfoId) return;

        const currentHistory = keyHistory?.filter((history) => history.uuid === currentInfoId);

        for (const [key, value] of Object.entries(currentHistory![0]?.additionalInformation ?? {})) {
            returnList.push(
                <tr>
                    <td style={{ padding: '0.25em' }}>{key}</td>
                    <td style={{ padding: '0.25em' }}>
                        <p
                            style={{
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                            }}
                        >
                            {JSON.stringify(value)}
                        </p>
                    </td>
                </tr>,
            );
        }

        return returnList;
    };

    return (
        <div className="key-details">
            <div>
                <h6 className="inline-block">
                    <Badge key={keyItem.uuid} color="gray">
                        {keyItem.keyAlgorithm}
                    </Badge>
                </h6>
                <div className="flex justify-end">
                    <WidgetButtons buttons={buttons} />
                </div>
            </div>
            <CustomTable headers={detailHeaders} data={detailData} />

            {keyItem.metadata && keyItem.metadata.length > 0 && (
                <Widget title="Metadata" className="mt-3" titleSize="large">
                    <AttributeViewer viewerType={ATTRIBUTE_VIEWER_TYPE.METADATA} metadata={keyItem.metadata} />
                </Widget>
            )}
            <Widget title="Event History" className="mt-3" titleSize="large" refreshAction={getFreshHistory}>
                <CustomTable headers={historyHeaders} data={historyEntry} hasPagination={true} />
            </Widget>
            <Dialog
                isOpen={confirmDelete}
                caption="Delete Key"
                body={
                    <div>
                        <p>You are about to delete Key. Is this what you want to do?</p>
                        {!tokenInstanceUuid && <p>{keyWithoutTokenInstanceActionNotes.delete}</p>}
                    </div>
                }
                size="lg"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />

            <Dialog
                isOpen={confirmCompromise}
                caption={`Compromised Key`}
                body={
                    <div>
                        <p className="text-center">You are about to mark the Key as compromised. Is this what you want to do?</p>
                        <p className="mt-2 mb-4 text-center">
                            <b>Warning:</b> This action cannot be undone.
                        </p>
                        <Select
                            id="compromiseReason"
                            options={optionForCompromise()}
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
                        {!tokenInstanceUuid && <p>{keyWithoutTokenInstanceActionNotes.destroy}</p>}
                        <p>
                            <b>Warning:</b> This action cannot be undone.
                        </p>
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
                isOpen={signData}
                caption="Sign Data"
                body={SignVerifyData({
                    action: 'sign',
                    visible: signData,
                    onClose: () => setSignData(false),
                    tokenUuid: tokenInstanceUuid,
                    keyUuid: keyUuid,
                    keyItemUuid: keyItem.uuid,
                    algorithm: keyItem.keyAlgorithm,
                    tokenProfileUuid: tokenProfileUuid,
                })}
                size="xl"
                toggle={() => setSignData(false)}
                buttons={[]}
            />

            <Dialog
                isOpen={verifyData}
                caption="Verify Signature"
                body={SignVerifyData({
                    action: 'verify',
                    visible: verifyData,
                    onClose: () => setVerifyData(false),
                    tokenUuid: tokenInstanceUuid,
                    keyUuid: keyUuid,
                    keyItemUuid: keyItem.uuid,
                    algorithm: keyItem.keyAlgorithm,
                    tokenProfileUuid: tokenProfileUuid,
                })}
                size="xl"
                toggle={() => setVerifyData(false)}
                buttons={[]}
            />

            <Dialog
                isOpen={currentInfoId !== ''}
                caption={`Additional Information`}
                body={additionalInfoEntry()}
                toggle={() => setCurrentInfoId('')}
                buttons={[]}
                size="lg"
            />

            <Dialog
                isOpen={displayKeyData}
                caption={`Key Data`}
                body={<div style={{ lineBreak: 'anywhere' }}>{keyItem.keyData}</div>}
                toggle={() => setDisplayKeyData(false)}
                buttons={[{ color: 'secondary', variant: 'outline', onClick: () => setDisplayKeyData(false), body: 'Close' }]}
                size="lg"
            />

            <Dialog
                isOpen={keyUsageUpdate}
                caption="Update Key Usage"
                body={<KeyUsageSelect value={keyUsages} onChange={setKeyUsages} keyUsageEnum={keyUsageEnum} keyType={keyItem.type} />}
                toggle={() => setKeyUsageUpdate(false)}
                size="md"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setKeyUsageUpdate(false), body: 'Cancel' },
                    { color: 'primary', onClick: onUpdateKeyUsageConfirmed, body: 'Update' },
                ]}
            />
        </div>
    );
}
