import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';
import DetailPageSkeleton from 'components/DetailPageSkeleton';
import Widget from 'components/Widget';
import { actions, selectors } from 'ducks/crypto-assets';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import { PlatformEnum } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import {
    CryptoAssetIdentity,
    CryptoAssetPayloads,
    CryptoAssetSources,
    CryptoAssetSummary,
    CryptoAssetVerdict,
} from './CryptoAssetDetailSections';

const LIST_PATH = '/cryptoassets';

export default function CryptoAssetDetail() {
    const dispatch = useDispatch();
    const { id = '' } = useParams();

    const detail = useSelector(selectors.selectCryptoAssetDetail);
    const isFetching = useSelector(selectors.selectIsFetchingDetail);
    const detailError = useSelector(selectors.selectCryptoAssetDetailError);
    const detailErrorStatusCode = useSelector(selectors.selectCryptoAssetDetailErrorStatusCode);

    const typeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CryptographicAssetType));
    const pqcVerdictEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.PqcVerdict));

    const getFreshDetail = useCallback(() => {
        if (!id) return;
        dispatch(actions.getCryptoAssetDetail({ uuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshDetail();
    }, [getFreshDetail]);

    useEffect(
        () => () => {
            dispatch(actions.clearCryptoAssetDetail());
        },
        [dispatch],
    );

    const hasFailed = detailErrorStatusCode !== undefined || detailError !== undefined;

    if (isFetching || (!detail && !hasFailed)) {
        return <DetailPageSkeleton />;
    }

    const breadcrumb = (
        <Breadcrumb
            items={[
                { label: 'Crypto Assets', href: LIST_PATH },
                { label: detail?.name ?? 'Crypto Asset Detail', href: '' },
            ]}
        />
    );

    if (!detail) {
        return (
            <div>
                {breadcrumb}
                <Container>
                    <Widget titleSize="large" widgetLockName={LockWidgetNameEnum.CryptoAssetDetail}>
                        <p className="py-8 px-4 text-sm text-content-muted">
                            {detailErrorStatusCode === 404
                                ? 'This cryptographic asset is not in the inventory.'
                                : (detailError ?? 'Unable to load the cryptographic asset.')}
                        </p>
                    </Widget>
                </Container>
            </div>
        );
    }

    const verdictLabel = getEnumLabel(pqcVerdictEnum, detail.pqcVerdict);

    return (
        <div>
            {breadcrumb}
            <Container>
                <Widget titleSize="large" widgetLockName={LockWidgetNameEnum.CryptoAssetDetail} refreshAction={getFreshDetail}>
                    <CryptoAssetSummary detail={detail} typeLabel={getEnumLabel(typeEnum, detail.type)} verdictLabel={verdictLabel} />
                </Widget>
                <div className="grid gap-4 md:grid-cols-2">
                    <Widget title="Identity" titleSize="large">
                        <CryptoAssetIdentity detail={detail} />
                    </Widget>
                    <Widget title="PQC verdict" titleSize="large">
                        <CryptoAssetVerdict detail={detail} verdictLabel={verdictLabel} />
                    </Widget>
                </div>
                <Widget title="Source CBOMs" titleSize="large">
                    <CryptoAssetSources detail={detail} />
                </Widget>
                <Widget title="Payloads" titleSize="large">
                    <CryptoAssetPayloads detail={detail} />
                </Widget>
            </Container>
        </div>
    );
}
