import cn from 'classnames';
import Breadcrumb from 'components/Breadcrumb';
import Button from 'components/Button';
import Container from 'components/Container';
import DetailPageSkeleton from 'components/DetailPageSkeleton';
import TabLayout from 'components/Layout/TabLayout';
import Widget from 'components/Widget';
import { actions, selectors } from 'ducks/crypto-assets';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { PlatformEnum } from 'types/openapi';
import { PQC_READINESS_TAB } from 'utils/crypto-assets';
import {
    CryptoAssetEvaluatedProperties,
    CryptoAssetIdentity,
    CryptoAssetPayloads,
    CryptoAssetPqcExplanation,
    CryptoAssetSources,
    CryptoAssetVerdict,
} from './CryptoAssetDetailSections';
import { UNTYPED_ASSET_LABEL } from '../cryptoAssetTableHelpers';

const LIST_PATH = '/cryptoassets';

export default function CryptoAssetDetail() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id = '' } = useParams();
    const [searchParams] = useSearchParams();
    const isReadinessTab = searchParams.get('tab') === PQC_READINESS_TAB;

    const detail = useSelector(selectors.selectCryptoAssetDetail);
    const isFetching = useSelector(selectors.selectIsFetchingDetail);
    const detailError = useSelector(selectors.selectCryptoAssetDetailError);
    const detailErrorStatusCode = useSelector(selectors.selectCryptoAssetDetailErrorStatusCode);
    const pqcExplanation = useSelector(selectors.selectPqcExplanation);
    const pqcExplanationLock = useSelector(selectors.selectPqcExplanationLock);
    const isFetchingPqcExplanation = useSelector(selectors.selectIsFetchingPqcExplanation);

    const typeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CryptographicAssetType));
    const pqcVerdictEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.PqcVerdict));
    const stepOutcomeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.PqcExplanationStepOutcome));

    const getFreshPqcExplanation = useCallback(() => {
        if (!id) return;
        dispatch(actions.getCryptoAssetPqcExplanation({ uuid: id }));
    }, [dispatch, id]);

    const getFreshDetail = useCallback(() => {
        if (!id) return;
        dispatch(actions.getCryptoAssetDetail({ uuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshDetail();
    }, [getFreshDetail]);

    // Core re-runs the whole rule set for an explanation, so it is asked for once the tab that shows it is open and
    // the asset it explains has loaded; a lock or an answer already held keeps this from asking again.
    const hasExplanationState = pqcExplanation !== undefined || pqcExplanationLock !== undefined || isFetchingPqcExplanation;
    useEffect(() => {
        if (isReadinessTab && detail?.uuid === id && !hasExplanationState) getFreshPqcExplanation();
    }, [isReadinessTab, detail?.uuid, id, hasExplanationState, getFreshPqcExplanation]);

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
                    <Widget titleSize="large">
                        <div className="py-8 px-4">
                            <p className="text-base font-medium">
                                {detailErrorStatusCode === 404
                                    ? 'This cryptographic asset is not in the inventory.'
                                    : 'Unable to load the cryptographic asset.'}
                            </p>
                            <p className="mt-2 text-sm text-content-muted">
                                {detailErrorStatusCode === 404
                                    ? 'It may have been removed when its source documents were last synced.'
                                    : (detailError ?? 'Please try again later.')}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Button type="button" variant="solid" color="primary" onClick={() => navigate(LIST_PATH)}>
                                    Back to Crypto Assets
                                </Button>
                                <Button type="button" variant="outline" color="secondary" onClick={getFreshDetail}>
                                    Retry
                                </Button>
                            </div>
                        </div>
                    </Widget>
                </Container>
            </div>
        );
    }

    const detailsTab = (
        <Container>
            <div className="grid gap-4 md:grid-cols-2">
                <Widget title="Identity" titleSize="large" refreshAction={getFreshDetail}>
                    <CryptoAssetIdentity
                        detail={detail}
                        typeLabel={detail.type ? getEnumLabel(typeEnum, detail.type) : UNTYPED_ASSET_LABEL}
                    />
                </Widget>
                <Widget title="PQC readiness" titleSize="large">
                    <CryptoAssetVerdict
                        detail={detail}
                        verdictLabel={getEnumLabel(pqcVerdictEnum, detail.pqcVerdict)}
                        typeEnum={typeEnum}
                    />
                </Widget>
            </div>
            <Widget title="Source CBOMs" titleSize="large">
                <CryptoAssetSources detail={detail} />
            </Widget>
            <Widget title="Crypto properties" titleSize="large">
                <CryptoAssetPayloads detail={detail} />
            </Widget>
        </Container>
    );

    // The properties sit beside the rules they explain once there is room; a failed explanation has none to show.
    const readinessTab = (
        <div className={cn('grid items-start gap-4', { '2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]': pqcExplanation !== undefined })}>
            <Widget
                title="PQC readiness evaluation"
                titleSize="large"
                dataTestId="crypto-asset-pqc-explanation"
                busy={isFetchingPqcExplanation}
                widgetLock={pqcExplanationLock}
                refreshAction={getFreshPqcExplanation}
            >
                {pqcExplanation && (
                    <CryptoAssetPqcExplanation
                        explanation={pqcExplanation}
                        enums={{ assetType: typeEnum, verdict: pqcVerdictEnum, outcome: stepOutcomeEnum }}
                    />
                )}
            </Widget>
            {pqcExplanation && (
                <Widget title="Evaluated properties" titleSize="large" dataTestId="crypto-asset-evaluated-properties">
                    <CryptoAssetEvaluatedProperties inputs={pqcExplanation.inputs} typeEnum={typeEnum} />
                </Widget>
            )}
        </div>
    );

    return (
        <div>
            {breadcrumb}
            <TabLayout
                tabUrlParam="tab"
                tabs={[
                    { title: 'Details', content: detailsTab },
                    { title: 'PQC readiness', tabKey: PQC_READINESS_TAB, content: readinessTab },
                ]}
            />
        </div>
    );
}
