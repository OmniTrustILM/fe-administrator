import JwkSetKeysTable from 'components/_pages/auth-settings/JwkSetKeysTable';
import OAuth2ProviderForm from 'components/_pages/auth-settings/form';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/auth-settings';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';

import { LockWidgetNameEnum } from 'types/user-interface';
import {
    AuthenticationScheme,
    DEFAULT_DELEGATE_CLAIM,
    DEFAULT_SESSION_MAX_INACTIVE_SECONDS,
    DEFAULT_SKEW_SECONDS,
    DEFAULT_USERNAME_CLAIM,
    formatSeconds,
    renderOAuth2StateBadges,
    schemesOfProvider,
} from 'utils/oauth2Providers';
import Badge from 'components/Badge';
import CopyUrlCell from 'components/CopyUrlCell';
import { Resource, ResourceAction } from 'types/openapi';
import { useActionAvailability } from 'utils/useActionAvailability';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';
import DetailPageSkeleton from 'components/DetailPageSkeleton';
import JwkSetLoadFailureWarning from 'components/_pages/auth-settings/JwkSetLoadFailureWarning';

function ValuePills({ values }: Readonly<{ values?: string[] }>) {
    if (!values?.length) return <>None</>;
    return (
        <div className="flex flex-wrap gap-1">
            {values.map((value) => (
                <Badge key={value}>{value}</Badge>
            ))}
        </div>
    );
}

function WithDefault({ value, fallback }: Readonly<{ value?: string; fallback: string }>) {
    if (value) return <>{value}</>;
    return (
        <>
            {fallback}
            <span className="ml-1 text-content-subtle text-xs">default</span>
        </>
    );
}

const durationOf = (seconds?: number) => (seconds === undefined ? undefined : formatSeconds(seconds));

export default function OAuth2ProviderDetail() {
    const { providerName } = useParams();
    const can = useActionAvailability(Resource.Settings);

    const dispatch = useDispatch();

    const oauth2Provider = useSelector(selectors.oauth2Provider);
    const selectedOAuth2Provider = oauth2Provider?.name === providerName ? oauth2Provider : undefined;
    const isFetchingProvider = useSelector(selectors.isFetchingProvider);
    const isUpdatingProvider = useSelector(selectors.isUpdatingProvider);
    const updateProviderSucceeded = useSelector(selectors.updateProviderSucceeded);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const getFreshData = useCallback(() => {
        if (!providerName) return;
        dispatch(actions.resetState());
        dispatch(actions.getOAuth2ProviderSettings({ providerName }));
    }, [dispatch, providerName]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    const handleOpenEditDialog = useCallback(() => {
        if (!providerName) return;
        setIsEditDialogOpen(true);
        dispatch(actions.getOAuth2ProviderSettings({ providerName }));
    }, [dispatch, providerName]);

    const handleCloseEditDialog = useCallback(() => {
        setIsEditDialogOpen(false);
        if (!selectedOAuth2Provider) {
            getFreshData();
        }
    }, [selectedOAuth2Provider, getFreshData]);

    useRunOnSuccessfulFinish(isUpdatingProvider, updateProviderSucceeded, () => {
        if (isEditDialogOpen) {
            handleCloseEditDialog();
            getFreshData();
        }
    });

    const onDeleteClick = useCallback(() => {
        if (!providerName) return;
        setIsDeleteDialogOpen(true);
    }, [providerName]);

    const onDeleteConfirmed = useCallback(() => {
        if (!providerName) return;
        setIsDeleteDialogOpen(false);
        dispatch(actions.removeOAuth2Provider({ providerName }));
    }, [dispatch, providerName]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'pencil',
                disabled: false,
                requires: can(ResourceAction.Update),
                tooltip: 'Edit',
                onClick: handleOpenEditDialog,
            },
            {
                icon: 'trash',
                disabled: false,
                requires: can(ResourceAction.Update),
                tooltip: 'Delete',
                onClick: () => {
                    onDeleteClick();
                },
            },
        ],
        [handleOpenEditDialog, onDeleteClick, can],
    );

    const headers: TableHeader[] = useMemo(
        () => [
            {
                id: 'property',
                content: 'Property',
            },
            {
                id: 'value',
                content: 'Value',
            },
        ],
        [],
    );

    const data: TableDataRow[] = useMemo(() => {
        if (!selectedOAuth2Provider) return [];
        const provider = selectedOAuth2Provider;
        const schemes = schemesOfProvider(provider);
        const url = (id: string, label: string, value?: string): TableDataRow => ({
            id,
            columns: [
                label,
                <CopyUrlCell key={id} label={label}>
                    {value}
                </CopyUrlCell>,
            ],
        });
        const jwtBearerRows: TableDataRow[] = [
            url('issuerUrl', 'Issuer Url', provider.issuerUrl),
            {
                id: 'allowedDelegates',
                columns: ['Allowed delegates', <ValuePills key="allowedDelegates" values={provider.allowedDelegates} />],
            },
            {
                id: 'delegateClaim',
                columns: [
                    'Delegate claim',
                    <WithDefault key="delegateClaim" value={provider.delegateClaim} fallback={DEFAULT_DELEGATE_CLAIM} />,
                ],
            },
        ];
        const oauth2FlowRows: TableDataRow[] = [
            { id: 'clientId', columns: ['Client Id', provider.clientId] },
            url('authorizationUrl', 'Authorization Url', provider.authorizationUrl),
            url('tokenUrl', 'Token Url', provider.tokenUrl),
            url('logoutUrl', 'Logout Url', provider.logoutUrl),
            url('postLogoutUrl', 'Post Logout Url', provider.postLogoutUrl),
            { id: 'scope', columns: ['Scope', <ValuePills key="scope" values={provider.scope} />] },
            {
                id: 'sessionMaxInactiveInterval',
                columns: [
                    'Session Max Inactive Interval',
                    <WithDefault
                        key="sessionMaxInactiveInterval"
                        value={durationOf(provider.sessionMaxInactiveInterval)}
                        fallback={formatSeconds(DEFAULT_SESSION_MAX_INACTIVE_SECONDS)}
                    />,
                ],
            },
        ];
        return [
            { id: 'name', columns: ['Name', provider.name] },
            { id: 'scheme', columns: ['Authentication schemes', renderOAuth2StateBadges(provider)] },
            ...(schemes.includes(AuthenticationScheme.JwtBearer) ? jwtBearerRows : []),
            ...(schemes.includes(AuthenticationScheme.OAuth2Flow) ? oauth2FlowRows : []),
            url('jwkSetUrl', 'JWK Set Url', provider.jwkSetUrl),
            url('userInfoUrl', 'User Info Url', provider.userInfoUrl),
            { id: 'audiences', columns: ['Audiences', <ValuePills key="audiences" values={provider.audiences} />] },
            {
                id: 'usernameClaim',
                columns: [
                    'Username claim',
                    <WithDefault key="usernameClaim" value={provider.usernameClaim} fallback={DEFAULT_USERNAME_CLAIM} />,
                ],
            },
            {
                id: 'skew',
                columns: [
                    'Skew',
                    <WithDefault key="skew" value={durationOf(provider.skew)} fallback={formatSeconds(DEFAULT_SKEW_SECONDS)} />,
                ],
            },
        ];
    }, [selectedOAuth2Provider]);
    const applicationsData: TableDataRow[] = useMemo(() => {
        const applications = selectedOAuth2Provider?.applications;
        if (!selectedOAuth2Provider || !applications?.enabled) return [];
        return [
            {
                id: 'applicationsName',
                columns: [
                    'Display name',
                    <WithDefault key="applicationsName" value={applications.name} fallback={selectedOAuth2Provider.name} />,
                ],
            },
            { id: 'applicationsClientId', columns: ['Public client Id', applications.clientId || 'Not set'] },
            {
                id: 'applicationsScopes',
                columns: ['Application scopes', <ValuePills key="applicationsScopes" values={applications.scopes} />],
            },
            {
                id: 'applicationsResource',
                columns: [
                    'Resource',
                    applications.resource ? (
                        <CopyUrlCell key="applicationsResource" label="Resource">
                            {applications.resource}
                        </CopyUrlCell>
                    ) : (
                        'Not set'
                    ),
                ],
            },
        ];
    }, [selectedOAuth2Provider]);

    if ((isFetchingProvider && !selectedOAuth2Provider) || (oauth2Provider && !selectedOAuth2Provider)) {
        return <DetailPageSkeleton layout="simple" buttonsCount={1} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: 'Authentication Settings', href: '/authenticationsettings' },
                    { label: selectedOAuth2Provider?.name || 'Provider Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.AuthenticationProviderDetails} busy={isFetchingProvider} noBorder>
                <Container>
                    <Widget title="Provider Details" widgetButtons={buttons} titleSize="large" refreshAction={getFreshData}>
                        <CustomTable headers={headers} data={data} />
                    </Widget>
                    {applicationsData.length > 0 && (
                        <Widget title="Sign-in for Applications" titleSize="large" refreshAction={getFreshData}>
                            <CustomTable headers={headers} data={applicationsData} />
                        </Widget>
                    )}
                    <Widget title="JWK Set Keys" titleSize="large" refreshAction={getFreshData}>
                        <JwkSetLoadFailureWarning failure={selectedOAuth2Provider?.jwkSetLoadFailure} />
                        <JwkSetKeysTable jwkSetKeys={selectedOAuth2Provider?.jwkSetKeys} />
                    </Widget>
                </Container>
            </Widget>
            <Dialog
                isOpen={isEditDialogOpen}
                toggle={handleCloseEditDialog}
                caption="Edit OAuth2 Provider"
                size="xl"
                body={<OAuth2ProviderForm providerName={providerName} onCancel={handleCloseEditDialog} />}
            />
            <Dialog
                isOpen={isDeleteDialogOpen}
                toggle={() => setIsDeleteDialogOpen(false)}
                size="lg"
                caption="Delete Authentication Provider"
                body="You're about to delete this authentication provider. This action can't be undone and may affect user sign-in. Do you want to continue?"
                icon="delete"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setIsDeleteDialogOpen(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />
        </div>
    );
}
