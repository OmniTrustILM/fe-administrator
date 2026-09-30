import PagedList from 'components/PagedList/PagedList';
import { buildCryptoAssetCellRegistry, CRYPTO_ASSET_COLUMNS } from 'components/_pages/crypto-assets/cryptoAssetTableHelpers';
import { actions, selectors } from 'ducks/crypto-assets';
import { getEnumDescription, getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { EntityType } from 'ducks/filters';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { ApiClients } from 'src/api';
import type { SearchRequestModel } from 'types/certificate';
import { type CryptographicAssetDto, PlatformEnum, Resource } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';

function CryptoAssetsList() {
    const dispatch = useDispatch();

    const assets = useSelector(selectors.selectCryptoAssetList);
    const isFetching = useSelector(selectors.selectIsFetchingList);

    const typeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CryptographicAssetType));
    const pqcVerdictEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.PqcVerdict));

    const registry = useMemo(
        () => buildCryptoAssetCellRegistry({ typeEnum, pqcVerdictEnum, getEnumLabel, getEnumDescription }),
        [typeEnum, pqcVerdictEnum],
    );

    const configurableColumns = useMemo(
        () => ({
            resource: Resource.CryptoAssets,
            standardColumns: CRYPTO_ASSET_COLUMNS,
            rows: assets,
            getRowId: (asset: CryptographicAssetDto) => asset.uuid,
            registry,
        }),
        [assets, registry],
    );

    const onList = useCallback((filters: SearchRequestModel) => dispatch(actions.listCryptoAssets(filters)), [dispatch]);

    const getAvailableFiltersApi = useCallback(
        (apiClients: ApiClients) => apiClients.cryptographicAssets.getCryptographicAssetSearchableFields(),
        [],
    );

    return (
        <PagedList
            entity={EntityType.CRYPTO_ASSET}
            onListCallback={onList}
            getAvailableFiltersApi={getAvailableFiltersApi}
            configurableColumns={configurableColumns}
            isBusy={isFetching}
            title="Crypto Assets"
            filterTitle="Crypto Assets Filter"
            entityNameSingular="a cryptographic asset"
            entityNamePlural="Crypto Assets"
            addHidden
            hasCheckboxes={false}
            pageWidgetLockName={LockWidgetNameEnum.ListOfCryptoAssets}
        />
    );
}

export default CryptoAssetsList;
