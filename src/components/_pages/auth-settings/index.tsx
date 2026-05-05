import DetailPageSkeleton from 'components/DetailPageSkeleton';
import JwkSetKeysTable from 'components/_pages/auth-settings/JwkSetKeysTable';
import OAuth2ProviderForm from 'components/_pages/auth-settings/form';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import TabLayout from 'components/Layout/TabLayout';
import ProgressButton from 'components/ProgressButton';
import Spinner from 'components/Spinner';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { actions as authSettingsActions, selectors as authSettingsSelectors } from 'ducks/auth-settings';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import Button from 'components/Button';
import Container from 'components/Container';
import Switch from 'components/Switch';
import { Key } from 'lucide-react';
import { LockWidgetNameEnum } from 'types/user-interface';
import { renderOAuth2StateBadges } from 'utils/oauth2Providers';

type FormValues = {
    disableLocalhostUser: boolean;
};

const AuthenticationSettings = () => {
    const dispatch = useDispatch();

    const authenticationSettings = useSelector(authSettingsSelectors.authenticationSettings);
    const isFetchingSettings = useSelector(authSettingsSelectors.isFetchingSettings);
    const isUpdatingSettings = useSelector(authSettingsSelectors.isUpdatingSettings);

    const oauth2Provider = useSelector(authSettingsSelectors.oauth2Provider);
    const isFetchingProvider = useSelector(authSettingsSelectors.isFetchingProvider);
    const isCreatingProvider = useSelector(authSettingsSelectors.isCreatingProvider);
    const createProviderSucceeded = useSelector(authSettingsSelectors.createProviderSucceeded);

    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [jwkSetKeysDialog, setJwkSetKeysDialog] = useState(false);
    const [isOAuth2FormDialogOpen, setIsOAuth2FormDialogOpen] = useState(false);

    const getAuthenticationSettings = useCallback(() => {
        dispatch(authSettingsActions.getAuthenticationSettings());
    }, [dispatch]);

    useEffect(() => {
        getAuthenticationSettings();
    }, [getAuthenticationSettings]);

    useEffect(() => {
        if (!selectedProvider) return;
        dispatch(authSettingsActions.resetOAuth2ProviderSettings());
        dispatch(authSettingsActions.getOAuth2ProviderSettings({ providerName: selectedProvider }));
    }, [dispatch, selectedProvider]);

    const isBusy = useMemo(() => isFetchingSettings, [isFetchingSettings]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (!values) return;
            dispatch(
                authSettingsActions.updateAuthenticationSettings({
                    authenticationSettingsUpdateModel: { disableLocalhostUser: values.disableLocalhostUser },
                }),
            );
        },
        [dispatch],
    );

    const onShowProviderJwkSetKeys = useCallback((providerName: string) => {
        setSelectedProvider(providerName);
        setJwkSetKeysDialog(true);
    }, []);

    const onCloseProviderJwkSetKeys = useCallback(() => {
        setSelectedProvider(null);
        setJwkSetKeysDialog(false);
    }, []);

    const handleOpenOAuth2FormDialog = useCallback(() => {
        setIsOAuth2FormDialogOpen(true);
        dispatch(authSettingsActions.resetOAuth2ProviderSettings());
    }, [dispatch]);

    const handleCloseOAuth2FormDialog = useCallback(() => {
        setIsOAuth2FormDialogOpen(false);
        dispatch(authSettingsActions.resetOAuth2ProviderSettings());
    }, [dispatch]);

    useRunOnSuccessfulFinish(isCreatingProvider, createProviderSucceeded, () => {
        if (isOAuth2FormDialogOpen) {
            handleCloseOAuth2FormDialog();
            getAuthenticationSettings();
        }
    });

    const providersButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: false,
                tooltip: 'Create',
                onClick: () => {
                    handleOpenOAuth2FormDialog();
                },
            },
        ],
        [handleOpenOAuth2FormDialog],
    );

    const providerHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'providerName',
                content: 'Name',
            },
            {
                id: 'issuerUrl',
                content: 'Issuer URL',
            },
            {
                id: 'scheme',
                content: 'Authentication scheme',
                align: 'center',
            },
            {
                id: 'moreInfo',
                content: '',
                width: '2%',
            },
        ],
        [],
    );

    const providerDataRows: TableDataRow[] = useMemo(
        () =>
            authenticationSettings?.oauth2Providers
                ? Object.entries(authenticationSettings.oauth2Providers).map(([providerName, provider]) => ({
                      id: providerName,
                      columns: [
                          <Link key="link" to={`./detail/${providerName}`}>
                              {providerName}
                          </Link>,
                          provider.issuerUrl ?? '',
                          renderOAuth2StateBadges(provider),
                          <Button
                              className="py-0 px-1 ml-2"
                              variant="transparent"
                              color="primary"
                              title="Detail"
                              key="jwkKeyInfo"
                              onClick={() => onShowProviderJwkSetKeys(providerName)}
                          >
                              <Key className="w-4 h-4" />
                          </Button>,
                      ],
                  }))
                : [],
        [authenticationSettings, onShowProviderJwkSetKeys],
    );

    const defaultValues = useMemo(() => {
        if (!authenticationSettings) return { disableLocalhostUser: false };
        return { disableLocalhostUser: authenticationSettings.disableLocalhostUser };
    }, [authenticationSettings]);

    const {
        handleSubmit,
        control,
        formState: { isDirty, isSubmitting },
        reset,
    } = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    // Reset form when authenticationSettings changes
    useEffect(() => {
        if (authenticationSettings) {
            reset({ disableLocalhostUser: authenticationSettings.disableLocalhostUser });
        }
    }, [authenticationSettings, reset]);

    const hasValuesChanged = useMemo(() => {
        return isDirty;
    }, [isDirty]);

    if (isFetchingSettings && !authenticationSettings) {
        return <DetailPageSkeleton layout="tabs" tabCount={2} showBreadcrumb={false} />;
    }

    return (
        <Container>
            <TabLayout
                tabs={[
                    {
                        title: 'Authentication Providers',
                        content: (
                            <Widget
                                title="OAuth2 Providers"
                                widgetButtons={providersButtons}
                                refreshAction={getAuthenticationSettings}
                                titleSize="large"
                                widgetLockName={LockWidgetNameEnum.AuthenticationSettings}
                                lockSize="large"
                                busy={isBusy}
                            >
                                <CustomTable headers={providerHeaders} data={providerDataRows} />
                            </Widget>
                        ),
                    },
                    {
                        title: 'Configuration',
                        content: (
                            <Widget
                                title="Authentication Settings"
                                titleSize="large"
                                refreshAction={getAuthenticationSettings}
                                busy={isBusy}
                                widgetLockName={LockWidgetNameEnum.AuthenticationSettings}
                                lockSize="large"
                                noBorder
                            >
                                <form onSubmit={handleSubmit(onSubmit)} className="mt-2">
                                    <Controller
                                        name="disableLocalhostUser"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                id="disableLocalhostUser"
                                                label="Disable Localhost User"
                                                checked={field.value}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                    <div className="flex justify-end mt-4">
                                        <ProgressButton
                                            title={'Apply'}
                                            inProgressTitle={'Applying..'}
                                            disabled={isSubmitting || isBusy || !hasValuesChanged}
                                            inProgress={isUpdatingSettings}
                                            type="submit"
                                        />
                                    </div>
                                </form>
                            </Widget>
                        ),
                    },
                ]}
            />
            <Dialog
                size="xl"
                isOpen={jwkSetKeysDialog}
                caption={`JWK Set Keys of "${selectedProvider}"`}
                body={
                    isFetchingProvider ? (
                        <div style={{ height: '100px' }}>
                            <Spinner active={isFetchingProvider} />
                        </div>
                    ) : (
                        <JwkSetKeysTable jwkSetKeys={oauth2Provider?.jwkSetKeys} />
                    )
                }
                toggle={onCloseProviderJwkSetKeys}
                buttons={[{ color: 'primary', variant: 'outline', onClick: onCloseProviderJwkSetKeys, body: 'Close' }]}
            />
            <Dialog
                isOpen={isOAuth2FormDialogOpen}
                toggle={handleCloseOAuth2FormDialog}
                caption="Create OAuth2 Provider"
                size="xl"
                body={<OAuth2ProviderForm onCancel={handleCloseOAuth2FormDialog} />}
            />
        </Container>
    );
};

export default AuthenticationSettings;
