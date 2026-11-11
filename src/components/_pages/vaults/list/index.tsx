import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';

import type { TableDataRow, TableHeader } from 'components/CustomTable';
import PagedList from 'components/PagedList/PagedList';
import Dialog from 'components/Dialog';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import type { ApiClients } from '../../../../api';
import { actions as vaultActions, selectors as vaultSelectors } from 'ducks/vaults';
import { EntityType } from 'ducks/filters';

import type { SearchRequestModel } from 'types/certificate';
import { LockWidgetNameEnum } from 'types/user-interface';
import { Resource, ResourceAction } from 'types/openapi';

import VaultForm from '../form';
import { useActionAvailability } from 'utils/useActionAvailability';

export default function VaultsList() {
    const dispatch = useDispatch();
    const can = useActionAvailability(Resource.Vaults);

    const vaults = useSelector(vaultSelectors.vaults);

    const isFetchingList = useSelector(vaultSelectors.isFetchingList);
    const isBusy = isFetchingList;

    const [isAddOpen, setIsAddOpen] = useState(false);

    const headers: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
                width: '30%',
                sortable: true,
            },
            {
                id: 'description',
                content: 'Description',
                width: '30%',
                maxWidth: 450,
            },
            {
                id: 'connector',
                content: 'Connector',
                width: '25%',
                sortable: true,
            },
            {
                id: 'features',
                content: 'Features',
                width: '15%',
            },
        ],
        [],
    );

    const rows: TableDataRow[] = useMemo(
        () =>
            vaults.map((vault) => ({
                id: vault.uuid,
                columns: [
                    <Link key="name" to={`./detail/${vault.uuid}`}>
                        {vault.name}
                    </Link>,
                    vault.description || '',
                    vault.connector ? (
                        <Link to={`/${Resource.Connectors.toLowerCase()}/detail/${vault.connector.uuid}`}>{vault.connector.name}</Link>
                    ) : (
                        ''
                    ),
                    '--',
                ],
            })),
        [vaults],
    );

    const onListCallback = useCallback((filters: SearchRequestModel) => dispatch(vaultActions.listVaults(filters)), [dispatch]);
    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: false,
                tooltip: 'Create Vault',
                requires: can(ResourceAction.Create),
                onClick: () => setIsAddOpen(true),
            },
        ],
        [can],
    );

    return (
        <>
            <PagedList
                entity={EntityType.VAULT}
                onListCallback={onListCallback}
                deleteRequires={can(ResourceAction.Delete)}
                onDeleteCallback={(uuids) => uuids.forEach((uuid) => dispatch(vaultActions.deleteVault({ uuid: String(uuid) })))}
                headers={headers}
                data={rows}
                isBusy={isBusy}
                title="List of Vaults"
                entityNameSingular="Vault"
                entityNamePlural="Vaults"
                filterTitle="Vaults Filter"
                pageWidgetLockName={LockWidgetNameEnum.ListOfVaults}
                getAvailableFiltersApi={useCallback((apiClients: ApiClients) => apiClients.vaults.getVaultInstanceSearchableFields(), [])}
                additionalButtons={buttons}
                addHidden
            />

            <Dialog
                isOpen={isAddOpen}
                caption="Create Vault"
                size="xl"
                toggle={() => setIsAddOpen(false)}
                body={<VaultForm onCancel={() => setIsAddOpen(false)} onSuccess={() => setIsAddOpen(false)} />}
            />
        </>
    );
}
