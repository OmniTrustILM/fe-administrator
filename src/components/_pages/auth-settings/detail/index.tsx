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
import { renderOAuth2StateBadges } from 'utils/oauth2Providers';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';
import DetailPageSkeleton from 'components/DetailPageSkeleton';
import JwkSetLoadFailureWarning from 'components/_pages/auth-settings/JwkSetLoadFailureWarning';

export default function OAuth2ProviderDetail() {
    const { providerName } = useParams();

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
                tooltip: 'Edit',
                onClick: handleOpenEditDialog,
            },
            {
                icon: 'trash',
                disabled: false,
                tooltip: 'Delete',
                onClick: () => {
                    onDeleteClick();
                },
            },
        ],
        [handleOpenEditDialog, onDeleteClick],
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

    const data: TableDataRow[] = useMemo(
        () =>
            selectedOAuth2Provider
                ? [
                      { id: 'name', columns: ['Name', <>{selectedOAuth2Provider.name}</>] },
                      { id: 'scheme', columns: ['Authentication Scheme', renderOAuth2StateBadges(selectedOAuth2Provider)] },
                      { id: 'clientId', columns: ['Client Id', <>{selectedOAuth2Provider.clientId}</>] },
                      { id: 'issuerUrl', columns: ['Issuer Url', <>{selectedOAuth2Provider.issuerUrl}</>] },
                      { id: 'authorizationUrl', columns: ['Authorization Url', <>{selectedOAuth2Provider.authorizationUrl}</>] },
                      { id: 'tokenUrl', columns: ['Token Url', <>{selectedOAuth2Provider.tokenUrl}</>] },
                      { id: 'jwkSetUrl', columns: ['JWK Set Url', <>{selectedOAuth2Provider.jwkSetUrl}</>] },
                      { id: 'logoutUrl', columns: ['Logout Url', <>{selectedOAuth2Provider.logoutUrl}</>] },
                      { id: 'postLogoutUrl', columns: ['Post Logout Url', <>{selectedOAuth2Provider.postLogoutUrl}</>] },
                      { id: 'userInfoUrl', columns: ['User Info Url', <>{selectedOAuth2Provider.userInfoUrl}</>] },
                      { id: 'scope', columns: ['Scope', <>{selectedOAuth2Provider.scope?.join(', ')}</>] },
                      { id: 'audiences', columns: ['Audiences', <>{selectedOAuth2Provider.audiences?.join(', ')}</>] },
                      {
                          id: 'skew',
                          columns: [
                              'Skew',
                              <>
                                  {selectedOAuth2Provider.skew} second{Number(selectedOAuth2Provider.skew) > 1 ? 's' : ''}
                              </>,
                          ],
                      },
                      {
                          id: 'sessionMaxInactiveInterval',
                          columns: [
                              'Session Max Inactive Interval',
                              <>
                                  {selectedOAuth2Provider.sessionMaxInactiveInterval} second
                                  {Number(selectedOAuth2Provider.sessionMaxInactiveInterval) > 1 ? 's' : ''}
                              </>,
                          ],
                      },
                  ]
                : [],
        [selectedOAuth2Provider],
    );
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
