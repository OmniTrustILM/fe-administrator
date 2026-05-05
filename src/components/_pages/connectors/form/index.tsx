import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';
import cn from 'classnames';

import { actions as connectorActions, selectors as connectorSelectors } from 'ducks/connectors';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';

import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import TextInput from 'components/TextInput';
import type { ConnectorResponseModel } from 'types/connectors';
import { AuthType, ConnectorStatus, ConnectorVersion, PlatformEnum, Resource } from 'types/openapi';

import { collectFormAttributes } from 'utils/attributes/attributes';
import { featureFlags } from 'utils/feature-flags';

import { validateAlphaNumericWithSpecialChars, validateRequired, validateRoutelessUrl } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from '../../../../ducks/customAttributes';
import AttributeEditor from '../../../Attributes/AttributeEditor';
import TabLayout from '../../../Layout/TabLayout';
import Label from 'components/Label';
import ConnectionDetailsV1 from './ConnectionDetailsV1';
import ConnectionDetailsV2 from './ConnectionDetailsV2';
import Switch from 'components/Switch';

type ConnectorFormProps = Readonly<{
    connectorId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

interface FormValues {
    uuid: string;
    name: string;
    url: string;
    authenticationType: string;
    username?: string;
    password?: string;
    clientCert?: FileList;
    useProxy?: boolean;
    proxyUuid?: string;
    version: ConnectorVersion;
}

export default function ConnectorForm({ connectorId, onCancel, onSuccess }: ConnectorFormProps) {
    const dispatch = useDispatch();

    const authTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.AuthType));
    const { id: routeId } = useParams();
    const id = connectorId || routeId;

    const editMode = useMemo(() => !!id, [id]);

    const optionsForAuth: { label: string; value: AuthType }[] = useMemo(
        () => [
            {
                label: getEnumLabel(authTypeEnum, AuthType.None),
                value: AuthType.None,
            },
            {
                label: getEnumLabel(authTypeEnum, AuthType.Basic),
                value: AuthType.Basic,
            },
            {
                label: getEnumLabel(authTypeEnum, AuthType.Certificate),
                value: AuthType.Certificate,
            },
        ],
        [authTypeEnum],
    );

    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);

    const isFetching = useSelector(connectorSelectors.isFetchingDetail);
    const isCreating = useSelector(connectorSelectors.isCreating);
    const isUpdating = useSelector(connectorSelectors.isUpdating);
    const isConnecting = useSelector(connectorSelectors.isConnecting);
    const isReconnecting = useSelector(connectorSelectors.isReconnecting);

    const connectorSelector = useSelector(connectorSelectors.connector);
    const connectionDetails = useSelector(connectorSelectors.connectorConnectInfo);
    const [connector, setConnector] = useState<ConnectorResponseModel>();

    const connectorUuid = useMemo(() => connectorSelector?.uuid, [connectorSelector?.uuid]);

    const submitTitle = useMemo(() => (editMode ? 'Save' : 'Create'), [editMode]);
    const connectTitle = useMemo(() => (editMode ? 'Reconnect' : 'Connect'), [editMode]);
    const inProgressTitle = useMemo(() => (editMode ? 'Saving...' : 'Creating...'), [editMode]);
    const connectProgressTitle = useMemo(() => (editMode ? 'Reconnecting...' : 'Connecting...'), [editMode]);

    useEffect(() => {
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Connectors));
    }, [dispatch]);

    useEffect(() => {
        if (id && (!connectorUuid || connectorUuid !== id) && !isFetching) {
            dispatch(connectorActions.getConnectorDetail({ uuid: id }));
        }
    }, [id, connectorUuid, isFetching, dispatch]);

    useEffect(() => {
        if (id && connectorUuid === id && !isFetching) {
            dispatch(connectorActions.reconnectConnector({ uuid: id }));
        }
    }, [id, connectorUuid, isFetching, dispatch]);

    useEffect(() => {
        if (id && connectorUuid === id && connectorSelector) {
            setConnector(connectorSelector);
        } else if (!id) {
            dispatch(connectorActions.clearConnectionDetails());
            dispatch(connectorActions.clearCallbackData());

            setConnector({
                uuid: '',
                name: '',
                url: '',
                authType: AuthType.None,
                status: ConnectorStatus.Offline,
                functionGroups: [],
            });
        }
    }, [id, connectorUuid, connectorSelector, dispatch]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (editMode) {
                if (!connector) return;
                dispatch(
                    connectorActions.updateConnector({
                        uuid: connector?.uuid,
                        connectorUpdateRequest: {
                            url: values.url,
                            authType: values.authenticationType as AuthType,
                            customAttributes: collectFormAttributes('customConnector', resourceCustomAttributes, values),
                        },
                    } as any),
                );
            } else {
                dispatch(
                    connectorActions.createConnector({
                        name: values.name,
                        url: values.url,
                        authType: values.authenticationType as AuthType,
                        customAttributes: collectFormAttributes('customConnector', resourceCustomAttributes, values),
                        version: values.version,
                    } as any),
                );
            }
        },
        [editMode, connector, dispatch, resourceCustomAttributes],
    );

    const handleCancel = useCallback(() => {
        onCancel?.();
    }, [onCancel]);

    const onConnectClick = useCallback(
        (values: FormValues) => {
            if (editMode) {
                if (!connector?.uuid) return;
                dispatch(
                    connectorActions.connectConnector({
                        uuid: connector.uuid,
                        url: values.url,
                        authType: values.authenticationType as AuthType,
                    }),
                );
            } else {
                dispatch(connectorActions.connectConnector({ url: values.url, authType: values.authenticationType as AuthType }));
            }
        },
        [connector, dispatch, editMode],
    );

    const defaultValues: FormValues = useMemo(
        () => ({
            uuid: connector?.uuid || '',
            name: editMode ? connector?.name || '' : '',
            url: editMode ? connector?.url || '' : '',
            authenticationType: editMode ? connector?.authType || AuthType.None : AuthType.None,
            useProxy: false,
            proxyUuid: '',
            version: editMode ? connector?.version || ConnectorVersion.V2 : ConnectorVersion.V2,
        }),
        [editMode, connector],
    );

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isDirty, isSubmitting, isValid },
        getValues,
        reset,
        setValue,
    } = methods;

    const watchedAuthType = useWatch({
        control,
        name: 'authenticationType',
    });

    const watchedUseProxy = useWatch({
        control,
        name: 'useProxy',
        defaultValue: false,
    });

    const watchedUrl = useWatch({
        control,
        name: 'url',
    });

    const watchedVersion = useWatch({
        control,
        name: 'version',
    });

    const selectedVersion = watchedVersion === ConnectorVersion.V1 ? ConnectorVersion.V1 : ConnectorVersion.V2;

    const selectedVersionInfo = useMemo(
        () => (connectionDetails || []).find((info: any) => info?.version === selectedVersion),
        [connectionDetails, selectedVersion],
    );

    const selectedVersionErrorMessage = useMemo(() => {
        const info = selectedVersionInfo as { errorMessage?: string; connectorUuid?: string } | undefined;
        const raw = info?.errorMessage;

        let message: string | undefined;

        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed?.message) {
                    message = parsed.message as string;
                } else {
                    message = raw;
                }
            } catch {
                message = raw;
            }
        }

        if (!editMode && selectedVersion === ConnectorVersion.V2 && info?.connectorUuid) {
            message = message || 'Connector with this URL and version is already added.';
        }

        return message;
    }, [selectedVersionInfo, editMode, selectedVersion]);

    const hasSuccessfulSelectedVersion = useMemo(
        () => !!selectedVersionInfo && !selectedVersionErrorMessage,
        [selectedVersionInfo, selectedVersionErrorMessage],
    );
    useEffect(() => {
        if (editMode && connector && connector.uuid === id) {
            const newDefaultValues: FormValues = {
                uuid: connector.uuid || '',
                name: connector.name || '',
                url: connector.url || '',
                authenticationType: connector.authType || AuthType.None,
                useProxy: false,
                proxyUuid: '',
                version: connector.version || ConnectorVersion.V2,
            };
            reset(newDefaultValues);
        }
    }, [editMode, connector, id, reset]);

    const hasConnectInfo = connectionDetails && connectionDetails.length > 0;

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className={`space-y-4 ${hasConnectInfo ? '' : 'mb-4'}`}>
                <Widget title="Connection Settings" titleSize="large">
                    <div className="space-y-4">
                        <Controller
                            name="url"
                            control={control}
                            rules={buildValidationRules([validateRequired(), validateRoutelessUrl()])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="url"
                                    type="text"
                                    label="URL"
                                    required
                                    placeholder="URL of the connector service"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <Controller
                            name="authenticationType"
                            control={control}
                            render={({ field, fieldState }) => (
                                <>
                                    <Select
                                        id="authenticationTypeSelect"
                                        label="Authentication Type"
                                        value={field.value || AuthType.None}
                                        onChange={(value) => {
                                            field.onChange(value);
                                        }}
                                        options={optionsForAuth.map((opt) => ({ value: opt.value, label: opt.label }))}
                                        placeholder="Select Auth Type"
                                        placement="bottom"
                                    />
                                    {fieldState.error && fieldState.isTouched && (
                                        <p className="mt-1 text-sm text-red-600">
                                            {typeof fieldState.error === 'string'
                                                ? fieldState.error
                                                : fieldState.error?.message || 'Invalid value'}
                                        </p>
                                    )}
                                </>
                            )}
                        />

                        {featureFlags.isProxiesEnabled && (
                            <>
                                <Controller
                                    name="useProxy"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch id="useProxy" label="Use proxy" checked={Boolean(field.value)} onChange={field.onChange} />
                                    )}
                                />

                                {watchedUseProxy && (
                                    <Controller
                                        name="proxyUuid"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                id="proxySelect"
                                                label="Proxy"
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                                options={[]}
                                                placeholder="Proxy list will be loaded from backend"
                                                placement="bottom"
                                            />
                                        )}
                                    />
                                )}
                            </>
                        )}

                        {watchedAuthType === AuthType.Basic && (
                            <>
                                <Controller
                                    name="username"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextInput
                                            {...field}
                                            id="username"
                                            type="text"
                                            label="Username"
                                            placeholder="Username"
                                            invalid={fieldState.error && fieldState.isTouched}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />

                                <Controller
                                    name="password"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextInput
                                            {...field}
                                            id="password"
                                            type="password"
                                            label="Password"
                                            placeholder="Password"
                                            invalid={fieldState.error && fieldState.isTouched}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />
                            </>
                        )}

                        {watchedAuthType === AuthType.Certificate && (
                            <div>
                                <Label htmlFor="clientCert">Client Certificate</Label>
                                <Controller
                                    name="clientCert"
                                    control={control}
                                    render={({ field: { onChange, value, ...field }, fieldState }) => (
                                        <>
                                            <input
                                                {...field}
                                                id="clientCert"
                                                type="file"
                                                onChange={(e) => {
                                                    onChange(e.target.files);
                                                }}
                                                className={cn(
                                                    'py-2.5 sm:py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600',
                                                    {
                                                        'border-red-500 focus:border-red-500 focus:ring-red-500':
                                                            fieldState.error && fieldState.isTouched,
                                                    },
                                                )}
                                            />
                                            {fieldState.error && fieldState.isTouched && (
                                                <p className="mt-1 text-sm text-red-600">
                                                    {typeof fieldState.error === 'string'
                                                        ? fieldState.error
                                                        : fieldState.error?.message || 'Invalid value'}
                                                </p>
                                            )}
                                        </>
                                    )}
                                />
                            </div>
                        )}

                        <Button
                            variant="outline"
                            onClick={() => onConnectClick(getValues())}
                            disabled={isSubmitting || isConnecting || isReconnecting || !watchedUrl || !isValid}
                            type="button"
                        >
                            {isConnecting || isReconnecting ? connectProgressTitle : connectTitle}
                        </Button>
                    </div>
                </Widget>

                {hasConnectInfo && (
                    <Widget busy={isConnecting} noBorder>
                        <Widget title="Connection Detected" titleSize="large">
                            {(() => {
                                if (editMode) {
                                    return connector?.version === ConnectorVersion.V1 ? (
                                        <ConnectionDetailsV1
                                            url={watchedUrl}
                                            connectionDetails={connectionDetails}
                                            errorMessage={selectedVersionErrorMessage}
                                        />
                                    ) : (
                                        <ConnectionDetailsV2 connectInfo={connectionDetails} errorMessage={selectedVersionErrorMessage} />
                                    );
                                }
                                return (
                                    <TabLayout
                                        noBorder
                                        selectedTab={selectedVersion === ConnectorVersion.V2 ? 0 : 1}
                                        onTabChange={(tab) =>
                                            setValue('version', tab === 0 ? ConnectorVersion.V2 : ConnectorVersion.V1, {
                                                shouldDirty: true,
                                                shouldValidate: true,
                                            })
                                        }
                                        tabs={[
                                            {
                                                title: 'v2',
                                                content: (
                                                    <ConnectionDetailsV2
                                                        connectInfo={connectionDetails}
                                                        errorMessage={selectedVersionErrorMessage}
                                                    />
                                                ),
                                            },
                                            {
                                                title: 'v1',
                                                content: (
                                                    <ConnectionDetailsV1
                                                        url={watchedUrl}
                                                        connectionDetails={connectionDetails}
                                                        errorMessage={selectedVersionErrorMessage}
                                                    />
                                                ),
                                            },
                                        ]}
                                    />
                                );
                            })()}
                        </Widget>
                        {hasSuccessfulSelectedVersion && (
                            <div className="space-y-4 mt-4">
                                <Widget title="Connector Name" titleSize="large">
                                    <Controller
                                        name="name"
                                        control={control}
                                        rules={buildValidationRules([validateRequired(), validateAlphaNumericWithSpecialChars()])}
                                        render={({ field, fieldState }) => (
                                            <TextInput
                                                {...field}
                                                id="name"
                                                type="text"
                                                label="Connector Name"
                                                required
                                                placeholder="Connector Name"
                                                disabled={editMode}
                                                invalid={fieldState.error && fieldState.isTouched}
                                                error={getFieldErrorMessage(fieldState)}
                                            />
                                        )}
                                    />
                                </Widget>

                                <Widget title="Custom Attributes" titleSize="large">
                                    <TabLayout
                                        noBorder
                                        tabs={[
                                            {
                                                title: 'Custom Attributes',
                                                content: (
                                                    <AttributeEditor
                                                        id="customConnector"
                                                        attributeDescriptors={resourceCustomAttributes}
                                                        attributes={connector?.customAttributes}
                                                    />
                                                ),
                                            },
                                        ]}
                                    />
                                </Widget>
                            </div>
                        )}
                        <Container className="flex-row justify-end modal-footer mt-4" gap={4}>
                            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>

                            <ProgressButton
                                title={submitTitle}
                                inProgressTitle={inProgressTitle}
                                inProgress={isUpdating || isCreating}
                                disabled={!isDirty || (!editMode && !!selectedVersionErrorMessage)}
                                type="submit"
                            />
                        </Container>
                    </Widget>
                )}
            </form>
        </FormProvider>
    );
}
