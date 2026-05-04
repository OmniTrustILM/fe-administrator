import DetailPageSkeleton from 'components/DetailPageSkeleton';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import Button from 'components/Button';
import { Copy, Download, Eye, Info, X } from 'lucide-react';
import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import JsonViewer from 'components/JsonViewer';
import Select from 'components/Select';
import TextInput from 'components/TextInput';
import DonutChart from 'components/_pages/dashboard/DashboardItem/DonutChart';
import Spinner from 'components/Spinner';
import TabLayout from 'components/Layout/TabLayout';
import Widget from 'components/Widget';
import { EntityType } from 'ducks/filters';
import { actions, selectors } from 'ducks/cbom';
import type { DashboardDict } from 'types/statisticsDashboard';
import { dateFormatter } from 'utils/dateUtil';
import { getDonutChartColorsByRandomNumberOfOptions } from 'utils/dashboard';

type CbomComponent = {
    name?: string;
    bomRef?: string;
    'bom-ref'?: string;
    type?: string;
    version?: string;
    evidence?: {
        occurrences?: {
            location?: string;
            [key: string]: unknown;
        }[];
    };
    cryptoProperties?: {
        assetType?: string;
        algorithmProperties?: {
            cryptoFunctions?: string[] | string;
            primitive?: string[] | string;
        };
        relatedCryptoMaterialProperties?: {
            type?: string;
        };
    };
};

type GenericObject = Record<string, unknown>;

type LocationModalState = {
    asset: string;
    rawJson: string;
    assetData: CbomComponent;
};

const VERSION_HISTORY_OPTION_VALUE = '__CBOM_VIEW_VERSION_HISTORY__';
const ALL_ASSET_TYPES_OPTION_VALUE = '__CBOM_ALL_ASSET_TYPES__';
const NON_CBOM_NOTICE_MESSAGE = 'The uploaded file does not contain cryptographic assets.';

const NonCbomNotice = () => (
    <div className="rounded-md border border-base-300 bg-base-200/30 p-4 text-sm" role="status" aria-live="polite" aria-atomic="true">
        {NON_CBOM_NOTICE_MESSAGE}
    </div>
);

const toArray = <T,>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

const toChartRows = (map: Map<string, number>): TableDataRow[] =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ id: `${name}-${count}`, columns: [name, count] }));

const toDashboardDict = (rows: TableDataRow[]): DashboardDict =>
    rows.reduce<DashboardDict>((acc, row) => {
        const [label, value] = row.columns;
        const key = String(label ?? 'Unknown');
        const count = Number(value ?? 0);
        acc[key] = Number.isFinite(count) ? count : 0;
        return acc;
    }, {});

const isRecord = (value: unknown): value is GenericObject => typeof value === 'object' && value !== null;

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const isCryptographicComponent = (component: CbomComponent): boolean => {
    const cbomAssetType = component?.cryptoProperties?.assetType;
    if (isNonEmptyString(cbomAssetType)) return true;

    return component?.type === 'cryptographic-asset';
};

const toCellValue = (value: unknown): string | number => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
};

const getPathValue = (obj: unknown, path: string): unknown => {
    if (!path) return undefined;

    const parts = path.split('/');
    let current: unknown = obj;

    for (const part of parts) {
        if (!isRecord(current)) return undefined;
        current = current[part];
        if (current === undefined) return undefined;
    }

    return current;
};

type HandleAssetDetailClick = (assetName: string, assetData: unknown) => void;

const buildComponentRows = (
    components: CbomComponent[],
    handleAssetDetailClick: HandleAssetDetailClick,
    view: 'assets' | 'overview',
): TableDataRow[] =>
    components.map((c, i: number) => {
        const assetName = c?.name ?? c?.['bom-ref'] ?? '-';
        const occurrences = toArray(c?.evidence?.occurrences);

        const locationsColumn =
            occurrences.length > 0 ? (
                <div className="flex flex-col gap-1">
                    {occurrences.map((occurrence, index) => {
                        const location = occurrence?.location || '-';
                        const key = `${String(assetName)}-${location}-${index}`;

                        return <div key={key}>{location}</div>;
                    })}
                </div>
            ) : (
                '-'
            );

        const actionColumn = (
            <Button
                variant="transparent"
                color="secondary"
                type="button"
                title="View asset detail"
                onClick={() => handleAssetDetailClick(String(assetName), c)}
                className="!p-1"
            >
                <Info size={16} aria-hidden="true" />
            </Button>
        );

        const assetType = toCellValue(c?.cryptoProperties?.assetType ?? c?.type);
        const primitiveValues = toArray(c?.cryptoProperties?.algorithmProperties?.primitive).filter(
            (value): value is string => typeof value === 'string' && value.trim().length > 0,
        );
        const primitive = primitiveValues.length > 0 ? primitiveValues.join(', ') : '-';

        return {
            id: c?.bomRef ?? c?.['bom-ref'] ?? (view === 'overview' ? `overview-${i}` : i),
            columns:
                view === 'overview'
                    ? [assetName, assetType, primitive, locationsColumn, actionColumn]
                    : [assetName, locationsColumn, assetType, primitive, actionColumn],
        };
    });

export default function CbomDetail() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id = '' } = useParams();

    const detail = useSelector(selectors.selectCbomDetail);
    const detailError = useSelector(selectors.selectCbomDetailError);
    const detailErrorStatusCode = useSelector(selectors.selectCbomDetailErrorStatusCode);
    const cbomVersions = useSelector(selectors.selectCbomVersions);
    const isFetching = useSelector(selectors.selectIsFetchingDetail);
    const isFetchingVersions = useSelector(selectors.selectIsFetchingVersions);
    const [locationModalData, setLocationModalData] = useState<LocationModalState>();
    const [selectedVersionUuid, setSelectedVersionUuid] = useState(id);
    const [assetSearchQuery, setAssetSearchQuery] = useState('');
    const [selectedAssetType, setSelectedAssetType] = useState<string>(ALL_ASSET_TYPES_OPTION_VALUE);
    const [activeTab, setActiveTab] = useState(0);
    const [renderedTab, setRenderedTab] = useState(0);
    const [isTabSwitching, setIsTabSwitching] = useState(false);
    const getFreshCbomDetail = useCallback(() => {
        if (!selectedVersionUuid || selectedVersionUuid === VERSION_HISTORY_OPTION_VALUE) return;
        dispatch(actions.clearCbomDetail());
        dispatch(actions.getCbomDetail({ uuid: selectedVersionUuid }));
    }, [dispatch, selectedVersionUuid]);

    useEffect(() => {
        setSelectedVersionUuid(id);
    }, [id]);

    useEffect(() => {
        getFreshCbomDetail();
    }, [getFreshCbomDetail]);

    useEffect(() => {
        if (!id) return;
        dispatch(actions.listCbomVersions({ uuid: id }));
    }, [dispatch, id]);

    const components = useMemo(() => {
        const content = detail?.content;
        if (!content) return [] as CbomComponent[];

        const contentComponents = content.components;
        if (Array.isArray(contentComponents)) return contentComponents as CbomComponent[];

        return [] as CbomComponent[];
    }, [detail]);

    const rawJsonText = useMemo(() => JSON.stringify(detail?.content ?? {}, null, 2), [detail]);

    const handleCopyRawJson = useCallback(() => {
        void navigator.clipboard.writeText(rawJsonText);
    }, [rawJsonText]);

    const handleDownloadRawJson = useCallback(() => {
        const blob = new Blob([rawJsonText], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `cbom-${detail?.serialNumber ?? id}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    }, [rawJsonText, detail, id]);

    const cryptographicComponents = useMemo(() => components.filter(isCryptographicComponent), [components]);

    const hasCryptographicAssets = cryptographicComponents.length > 0;
    const showNonCbomAssetsNotice = !hasCryptographicAssets && components.length > 0;

    const assetsByCategoryRows: TableDataRow[] = useMemo(() => {
        const map = new Map<string, number>([
            ['algorithm', 0],
            ['certificate', 0],
            ['protocol', 0],
            ['related-crypto-material', 0],
        ]);

        for (const component of cryptographicComponents) {
            const rawAssetType = component?.cryptoProperties?.assetType;
            if (!isNonEmptyString(rawAssetType)) continue;

            const normalizedAssetType = rawAssetType.trim().toLowerCase();
            if (!map.has(normalizedAssetType)) continue;

            map.set(normalizedAssetType, (map.get(normalizedAssetType) ?? 0) + 1);
        }

        return [
            { id: 'algorithms', columns: ['Algorithms', map.get('algorithm') ?? 0] },
            { id: 'certificates', columns: ['Certificates', map.get('certificate') ?? 0] },
            { id: 'protocols', columns: ['Protocols', map.get('protocol') ?? 0] },
            { id: 'cryptoMaterial', columns: ['Related Crypto Material', map.get('related-crypto-material') ?? 0] },
        ];
    }, [cryptographicComponents]);

    const algorithmsByNameRows = useMemo(() => {
        const map = new Map<string, number>();
        for (const c of cryptographicComponents) {
            if (c?.cryptoProperties?.assetType === 'algorithm') {
                map.set(c?.name ?? 'Unknown', (map.get(c?.name ?? 'Unknown') ?? 0) + 1);
            }
        }
        return toChartRows(map);
    }, [cryptographicComponents]);

    const cryptoFunctionsRows = useMemo(() => {
        const map = new Map<string, number>();
        for (const c of cryptographicComponents) {
            const vals = toArray<string>(c?.cryptoProperties?.algorithmProperties?.cryptoFunctions);
            for (const v of vals) map.set(v, (map.get(v) ?? 0) + 1);
        }
        return toChartRows(map);
    }, [cryptographicComponents]);

    const cryptoPrimitivesRows = useMemo(() => {
        const map = new Map<string, number>();
        for (const c of cryptographicComponents) {
            const vals = toArray<string>(c?.cryptoProperties?.algorithmProperties?.primitive);
            for (const v of vals) map.set(v, (map.get(v) ?? 0) + 1);
        }
        return toChartRows(map);
    }, [cryptographicComponents]);

    const relatedMaterialTypesRows = useMemo(() => {
        const map = new Map<string, number>();
        for (const c of cryptographicComponents) {
            if (c?.cryptoProperties?.assetType !== 'related-crypto-material') continue;
            const type = c?.cryptoProperties?.relatedCryptoMaterialProperties?.type ?? 'Unknown';
            map.set(type, (map.get(type) ?? 0) + 1);
        }
        return toChartRows(map);
    }, [cryptographicComponents]);

    const assetsByCategoryChartData = useMemo(() => toDashboardDict(assetsByCategoryRows), [assetsByCategoryRows]);
    const algorithmsByNameChartData = useMemo(() => toDashboardDict(algorithmsByNameRows), [algorithmsByNameRows]);
    const cryptoFunctionsChartData = useMemo(() => toDashboardDict(cryptoFunctionsRows), [cryptoFunctionsRows]);
    const cryptoPrimitivesChartData = useMemo(() => toDashboardDict(cryptoPrimitivesRows), [cryptoPrimitivesRows]);
    const relatedMaterialTypesChartData = useMemo(() => toDashboardDict(relatedMaterialTypesRows), [relatedMaterialTypesRows]);

    const metadata = useMemo(() => {
        const content = detail?.content;
        if (!isRecord(content)) return undefined;
        return isRecord(content.metadata) ? content.metadata : undefined;
    }, [detail]);

    const keyValueHeaders: TableHeader[] = useMemo(
        () => [
            { id: 'attribute', content: 'ATTRIBUTE' },
            { id: 'value', content: 'VALUE' },
        ],
        [],
    );

    const basicDetailsRows: TableDataRow[] = useMemo(
        () => [
            { id: 'serial-number', columns: ['Serial Number', toCellValue(detail?.serialNumber)] },
            { id: 'version', columns: ['Version', toCellValue(detail?.version)] },
            { id: 'spec-version', columns: ['Spec version', toCellValue(detail?.specVersion)] },
            { id: 'source', columns: ['Source', toCellValue(detail?.source)] },
            { id: 'total-assets', columns: ['Total assets', toCellValue(detail?.totalAssets)] },
        ],
        [detail],
    );

    const metadataSummaryRows: TableDataRow[] = useMemo(() => {
        const properties = isRecord(metadata) ? metadata.properties : undefined;

        const timestampRaw = getPathValue(metadata, 'timestamp');

        const predefinedRows: TableDataRow[] = [
            {
                id: 'timestamp',
                columns: ['Timestamp', toCellValue(timestampRaw ? dateFormatter(timestampRaw as any) : undefined)],
            },
            {
                id: 'type',
                columns: [
                    'Type',
                    toCellValue(
                        getPathValue(metadata, 'component/type') ?? getPathValue(metadata, 'type') ?? getPathValue(detail?.content, 'type'),
                    ),
                ],
            },
            {
                id: 'manufacturer',
                columns: [
                    'Manufacturer',
                    toCellValue(
                        getPathValue(metadata, 'component/manufacturer/name') ??
                            getPathValue(metadata, 'manufacturer/name') ??
                            getPathValue(metadata, 'manufacturer'),
                    ),
                ],
            },
        ];

        if (!Array.isArray(properties)) return predefinedRows;

        const propertiesRows = properties.map((property, index) => {
            if (!isRecord(property)) {
                return {
                    id: `metadata-property-${index}`,
                    columns: [`Property ${index + 1}`, '-'],
                };
            }

            const propertyName =
                typeof property.name === 'string' && property.name.trim().length > 0 ? property.name : `Property ${index + 1}`;

            return {
                id: `metadata-property-${index}`,
                columns: [propertyName, toCellValue(property.value)],
            };
        });

        return [...predefinedRows, ...propertiesRows];
    }, [metadata, detail]);

    const componentHeaders: TableHeader[] = useMemo(
        () => [
            { id: 'assets', content: 'Crypto asset' },
            { id: 'location', content: 'Location' },
            { id: 'type', content: 'Asset Type' },
            { id: 'primitive', content: 'Primitive' },
            { id: 'action', content: 'Action', align: 'center' },
        ],
        [],
    );

    const overviewComponentHeaders: TableHeader[] = useMemo(
        () => [
            { id: 'assets', content: 'Crypto asset' },
            { id: 'type', content: 'Asset Type' },
            { id: 'primitive', content: 'Primitive' },
            { id: 'location', content: 'Location' },
            { id: 'action', content: 'Action', align: 'center' },
        ],
        [],
    );

    const handleAssetDetailClick = useCallback((assetName: string, assetData: unknown) => {
        const typedAssetData = (assetData ?? {}) as CbomComponent;
        setLocationModalData({
            asset: assetName,
            rawJson: JSON.stringify(typedAssetData, null, 2),
            assetData: typedAssetData,
        });
    }, []);

    const modalAssetDetailHeaders: TableHeader[] = useMemo(
        () => [
            { id: 'attribute', content: 'Attribute' },
            { id: 'value', content: 'Value' },
        ],
        [],
    );

    const modalAssetDetailRows: TableDataRow[] = useMemo(() => {
        if (!locationModalData?.assetData) return [];

        const asset = locationModalData.assetData;
        const primitiveValues = toArray(asset?.cryptoProperties?.algorithmProperties?.primitive).filter(
            (value): value is string => typeof value === 'string' && value.trim().length > 0,
        );
        const locationValues = toArray(asset?.evidence?.occurrences)
            .map((occurrence) => occurrence?.location)
            .filter((location): location is string => typeof location === 'string' && location.trim().length > 0);

        return [
            { id: 'asset-type', columns: ['Asset type', toCellValue(asset?.cryptoProperties?.assetType)] },
            { id: 'type', columns: ['Type', toCellValue(asset?.type)] },
            { id: 'primitive', columns: ['Primitive', primitiveValues.length > 0 ? primitiveValues.join(', ') : '-'] },
            { id: 'location', columns: ['Location', locationValues.length > 0 ? locationValues.join(', ') : '-'] },
            { id: 'source', columns: ['Source', toCellValue(detail?.source)] },
            { id: 'cbom-version', columns: ['CBOM version', toCellValue(detail?.version)] },
        ];
    }, [locationModalData, detail]);

    const handleCopyAssetJson = useCallback(() => {
        if (!locationModalData?.rawJson) return;
        void navigator.clipboard.writeText(locationModalData.rawJson);
    }, [locationModalData]);

    const handleCloseLocationModal = useCallback(() => {
        setLocationModalData(undefined);
    }, []);

    const versionSelectOptions = useMemo(() => {
        const latestVersionNumber = cbomVersions.length ? Math.max(...cbomVersions.map((version) => version.version)) : undefined;
        const originalVersionNumber = cbomVersions.length ? Math.min(...cbomVersions.map((version) => version.version)) : undefined;

        const versionOptions = [...cbomVersions]
            .sort((a, b) => b.version - a.version)
            .map((version) => {
                const suffix =
                    version.version === latestVersionNumber ? ' (Latest)' : version.version === originalVersionNumber ? ' (Original)' : '';

                return {
                    value: version.uuid,
                    label: `Version ${version.version}${suffix}`,
                    description: dateFormatter(version.timestamp || version.createdAt),
                };
            });

        return [
            ...versionOptions,
            {
                value: VERSION_HISTORY_OPTION_VALUE,
                label: 'View Version History',
                description: `${cbomVersions.length} versions`,
            },
        ];
    }, [cbomVersions]);

    const handleVersionSelect = useCallback(
        (value: string | number | object | { value: string | number | object; label: string }) => {
            const selectedValue =
                typeof value === 'string' || typeof value === 'number'
                    ? String(value)
                    : typeof value === 'object' && value !== null && 'value' in value
                      ? String(value.value)
                      : '';

            if (!selectedValue || !id) return;

            if (selectedValue === VERSION_HISTORY_OPTION_VALUE) {
                navigate(`/cboms/detail/${id}/versions`);
                return;
            }

            navigate(`/cboms/detail/${selectedValue}`);
            setSelectedVersionUuid(selectedValue);
        },
        [navigate, id],
    );

    const overviewComponentRows: TableDataRow[] = useMemo(
        () => buildComponentRows(cryptographicComponents, handleAssetDetailClick, 'overview'),
        [cryptographicComponents, handleAssetDetailClick],
    );

    const assetTypeOptions = useMemo(() => {
        const uniqueTypes = new Set<string>();

        for (const component of cryptographicComponents) {
            const typeValue = component?.cryptoProperties?.assetType ?? component?.type;
            if (typeof typeValue === 'string' && typeValue.trim().length > 0) {
                uniqueTypes.add(typeValue.trim());
            }
        }

        return [
            {
                value: ALL_ASSET_TYPES_OPTION_VALUE,
                label: 'All asset types',
            },
            ...[...uniqueTypes]
                .sort((a, b) => a.localeCompare(b))
                .map((type) => ({
                    value: type,
                    label: type,
                })),
        ];
    }, [cryptographicComponents]);

    useEffect(() => {
        const hasSelectedOption = assetTypeOptions.some((option) => String(option.value) === selectedAssetType);
        if (!hasSelectedOption) {
            setSelectedAssetType(ALL_ASSET_TYPES_OPTION_VALUE);
        }
    }, [assetTypeOptions, selectedAssetType]);

    const filteredComponents = useMemo(() => {
        const normalizedSearch = assetSearchQuery.trim().toLowerCase();

        return cryptographicComponents.filter((component) => {
            const componentAssetType = component?.cryptoProperties?.assetType ?? component?.type;
            const assetTypeMatches = selectedAssetType === ALL_ASSET_TYPES_OPTION_VALUE || componentAssetType === selectedAssetType;

            if (!assetTypeMatches) return false;
            if (!normalizedSearch) return true;

            const assetName = component?.name ?? component?.['bom-ref'] ?? component?.bomRef ?? '';
            const locations = toArray(component?.evidence?.occurrences)
                .map((occurrence) => occurrence?.location)
                .filter((location): location is string => typeof location === 'string' && location.trim().length > 0)
                .join(' ');
            const primitive = toArray(component?.cryptoProperties?.algorithmProperties?.primitive)
                .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
                .join(' ');

            const searchableText = `${assetName} ${locations} ${primitive}`.toLowerCase().trim();

            return searchableText.includes(normalizedSearch);
        });
    }, [cryptographicComponents, assetSearchQuery, selectedAssetType]);

    const handleAssetTypeChange = useCallback((value: string | number | object | { value: string | number | object; label: string }) => {
        const selectedValue =
            typeof value === 'string' || typeof value === 'number'
                ? String(value)
                : typeof value === 'object' && value !== null && 'value' in value
                  ? String(value.value)
                  : ALL_ASSET_TYPES_OPTION_VALUE;

        setSelectedAssetType(selectedValue || ALL_ASSET_TYPES_OPTION_VALUE);
    }, []);

    const componentRows: TableDataRow[] = useMemo(
        () => buildComponentRows(filteredComponents, handleAssetDetailClick, 'assets'),
        [filteredComponents, handleAssetDetailClick],
    );

    useEffect(() => {
        if (activeTab === renderedTab) {
            setIsTabSwitching(false);
            return;
        }

        let rafNested = 0;
        const raf = requestAnimationFrame(() => {
            rafNested = requestAnimationFrame(() => {
                setRenderedTab(activeTab);
                setIsTabSwitching(false);
            });
        });

        return () => {
            cancelAnimationFrame(raf);
            if (rafNested) {
                cancelAnimationFrame(rafNested);
            }
        };
    }, [activeTab, renderedTab]);

    const handleDetailTabChange = useCallback(
        (tab: number) => {
            if (tab === activeTab) return;
            setActiveTab(tab);
            setIsTabSwitching(true);
        },
        [activeTab],
    );

    if (isFetching) {
        return <DetailPageSkeleton layout="tabs" tabCount={3} />;
    }

    const tabSwitchLoadingContent = (
        <Container>
            <div className="min-h-[260px] flex flex-col items-center justify-center gap-3">
                <Spinner active size="lg" />
                <p className="text-sm text-base-content/70">Loading tab content...</p>
            </div>
        </Container>
    );

    const isStaleDetailFromPreviousCbom =
        Boolean(detail?.uuid) && Boolean(selectedVersionUuid) && String(detail?.uuid) !== String(selectedVersionUuid);

    const isCbomMissingInRepository = detailErrorStatusCode === 404;
    const hasDetailRequestFailed = detailErrorStatusCode !== undefined || Boolean(detailError);

    if ((!detail || isStaleDetailFromPreviousCbom) && (isFetching || !hasDetailRequestFailed || isStaleDetailFromPreviousCbom)) {
        return (
            <div>
                <Breadcrumb
                    items={[
                        { label: 'CBOM Inventory', href: '/cboms' },
                        { label: 'CBOM Detail', href: '' },
                    ]}
                />
                <div className="min-h-[320px] flex flex-col items-center justify-center gap-4">
                    <Spinner active size="lg" />
                </div>
            </div>
        );
    }

    if (!isFetching && !detail && hasDetailRequestFailed) {
        return (
            <div>
                <Breadcrumb
                    items={[
                        { label: 'CBOM Inventory', href: '/cboms' },
                        { label: 'CBOM Detail', href: '' },
                    ]}
                />

                <Container>
                    <Widget titleSize="large">
                        <div className="py-8 px-4">
                            <p className="text-base font-medium">
                                {isCbomMissingInRepository
                                    ? 'This CBOM no longer exists in the repository.'
                                    : 'Unable to load CBOM detail.'}
                            </p>
                            <p className="mt-2 text-sm text-base-content/80">
                                {isCbomMissingInRepository
                                    ? 'Please synchronize the inventory.'
                                    : (detailError ?? 'Please try again later.')}
                            </p>
                            <div className="mt-4">
                                <Button type="button" variant="solid" color="primary" onClick={() => navigate('/cboms')}>
                                    Back to CBOM Inventory
                                </Button>
                            </div>
                        </div>
                    </Widget>
                </Container>
            </div>
        );
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: 'CBOM Inventory', href: '/cboms' },
                    { label: detail ? `${detail.serialNumber} / ${detail.version}` : 'CBOM Detail', href: '' },
                ]}
                rightContent={
                    <div className="w-full md:w-72">
                        <Select
                            id="cbom-version-history-select"
                            placeholder="Select version"
                            value={selectedVersionUuid}
                            onChange={handleVersionSelect}
                            options={versionSelectOptions}
                            disabled={isFetchingVersions || versionSelectOptions.length === 0}
                            colorizeVersionLabel
                            showOptionDescriptionInDropdown
                        />
                    </div>
                }
            />

            <Spinner active={isFetching} />

            <TabLayout
                selectedTab={activeTab}
                onTabChange={handleDetailTabChange}
                tabs={[
                    {
                        title: 'Overview',
                        content:
                            isTabSwitching && activeTab === 0 && renderedTab !== 0 ? (
                                tabSwitchLoadingContent
                            ) : (
                                <Container>
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-8">
                                        <Widget title="Basic details" titleSize="large">
                                            <CustomTable headers={keyValueHeaders} data={basicDetailsRows} />
                                        </Widget>
                                        <Widget title="Metadata summary" titleSize="large">
                                            <CustomTable headers={keyValueHeaders} data={metadataSummaryRows} />
                                        </Widget>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8">
                                        {Object.keys(assetsByCategoryChartData).length > 0 && (
                                            <DonutChart
                                                title="Assets by category"
                                                data={assetsByCategoryChartData}
                                                colorOptions={getDonutChartColorsByRandomNumberOfOptions(
                                                    Object.keys(assetsByCategoryChartData).length,
                                                )}
                                                entity={EntityType.CBOM}
                                                onSetFilter={() => []}
                                                redirect="../cboms"
                                                showValuesInLegend
                                                interactiveLegend={false}
                                                showCenterLabel
                                                chartSize="full"
                                            />
                                        )}
                                        {Object.keys(algorithmsByNameChartData).length > 0 && (
                                            <DonutChart
                                                title="Algorithms by name"
                                                data={algorithmsByNameChartData}
                                                colorOptions={getDonutChartColorsByRandomNumberOfOptions(
                                                    Object.keys(algorithmsByNameChartData).length,
                                                )}
                                                entity={EntityType.CBOM}
                                                onSetFilter={() => []}
                                                redirect="../cboms"
                                                showValuesInLegend
                                                interactiveLegend={false}
                                                showCenterLabel
                                                chartSize="full"
                                            />
                                        )}
                                        {Object.keys(cryptoFunctionsChartData).length > 0 && (
                                            <DonutChart
                                                title="Crypto functions"
                                                data={cryptoFunctionsChartData}
                                                colorOptions={getDonutChartColorsByRandomNumberOfOptions(
                                                    Object.keys(cryptoFunctionsChartData).length,
                                                )}
                                                entity={EntityType.CBOM}
                                                onSetFilter={() => []}
                                                redirect="../cboms"
                                                showValuesInLegend
                                                interactiveLegend={false}
                                                showCenterLabel
                                                chartSize="full"
                                            />
                                        )}
                                        {Object.keys(cryptoPrimitivesChartData).length > 0 && (
                                            <DonutChart
                                                title="Crypto primitives"
                                                data={cryptoPrimitivesChartData}
                                                colorOptions={getDonutChartColorsByRandomNumberOfOptions(
                                                    Object.keys(cryptoPrimitivesChartData).length,
                                                )}
                                                entity={EntityType.CBOM}
                                                onSetFilter={() => []}
                                                redirect="../cboms"
                                                showValuesInLegend
                                                interactiveLegend={false}
                                                showCenterLabel
                                                chartSize="full"
                                            />
                                        )}
                                        {Object.keys(relatedMaterialTypesChartData).length > 0 && (
                                            <DonutChart
                                                title="Crypto related material types"
                                                data={relatedMaterialTypesChartData}
                                                colorOptions={getDonutChartColorsByRandomNumberOfOptions(
                                                    Object.keys(relatedMaterialTypesChartData).length,
                                                )}
                                                entity={EntityType.CBOM}
                                                onSetFilter={() => []}
                                                redirect="../cboms"
                                                showValuesInLegend
                                                interactiveLegend={false}
                                                showCenterLabel
                                                chartSize="full"
                                            />
                                        )}
                                    </div>
                                    <div className="mt-4 md:mt-8">
                                        <Widget title="Assets" titleSize="large">
                                            {showNonCbomAssetsNotice ? (
                                                <NonCbomNotice />
                                            ) : (
                                                <CustomTable
                                                    headers={overviewComponentHeaders}
                                                    data={overviewComponentRows}
                                                    hasPagination
                                                />
                                            )}
                                        </Widget>
                                    </div>
                                </Container>
                            ),
                    },
                    {
                        title: 'Assets',
                        content:
                            isTabSwitching && activeTab === 1 && renderedTab !== 1 ? (
                                tabSwitchLoadingContent
                            ) : (
                                <Container>
                                    <Widget titleSize="large">
                                        {showNonCbomAssetsNotice ? (
                                            <NonCbomNotice />
                                        ) : (
                                            <>
                                                <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                                                    <div className="md:col-span-2">
                                                        <TextInput
                                                            id="cbom-assets-search"
                                                            value={assetSearchQuery}
                                                            onChange={setAssetSearchQuery}
                                                            placeholder="Search assets (crypto asset, location, primitive)"
                                                            buttonRight={
                                                                assetSearchQuery ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setAssetSearchQuery('')}
                                                                        aria-label="Clear search"
                                                                        title="Clear search"
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                ) : undefined
                                                            }
                                                        />
                                                    </div>
                                                    <Select
                                                        id="cbom-assets-type-filter"
                                                        value={selectedAssetType}
                                                        onChange={handleAssetTypeChange}
                                                        options={assetTypeOptions}
                                                        placeholder="Filter by asset type"
                                                    />
                                                </div>

                                                <CustomTable
                                                    headers={componentHeaders}
                                                    data={componentRows}
                                                    hasPagination
                                                    itemsPerPageOptions={[10, 20, 50, 100, 200, 500, 1000]}
                                                />
                                            </>
                                        )}
                                    </Widget>
                                </Container>
                            ),
                    },

                    {
                        title: 'Raw JSON',
                        content:
                            isTabSwitching && activeTab === 2 && renderedTab !== 2 ? (
                                tabSwitchLoadingContent
                            ) : (
                                <Container>
                                    <Widget titleSize="large">
                                        <div className="relative">
                                            <div className="absolute top-3 right-5 flex gap-2 z-10">
                                                <Button
                                                    variant="transparent"
                                                    color="secondary"
                                                    type="button"
                                                    title="Copy"
                                                    onClick={handleCopyRawJson}
                                                    className="!text-white hover:!bg-white/10 focus:!bg-white/10"
                                                >
                                                    <Copy size={18} aria-hidden="true" />
                                                </Button>
                                                <Button
                                                    variant="transparent"
                                                    color="secondary"
                                                    type="button"
                                                    title="Download"
                                                    onClick={handleDownloadRawJson}
                                                    className="!text-white hover:!bg-white/10 focus:!bg-white/10"
                                                >
                                                    <Download size={18} aria-hidden="true" />
                                                </Button>
                                            </div>
                                            <JsonViewer value={rawJsonText} height={900} paddingTop={44} />
                                        </div>
                                    </Widget>
                                </Container>
                            ),
                    },
                ]}
            />

            <Dialog
                isOpen={!!locationModalData}
                toggle={handleCloseLocationModal}
                caption="Asset detail"
                size="xl"
                noBorder
                body={
                    <div className="flex flex-col gap-4 pb-6">
                        <CustomTable headers={modalAssetDetailHeaders} data={modalAssetDetailRows} />

                        <JsonViewer value={locationModalData?.rawJson ?? ''} height={278} />

                        <div className="flex items-center justify-between pt-2">
                            <Button type="button" variant="solid" color="primary" onClick={handleCopyAssetJson} className="text-black">
                                Copy JSON
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                color="secondary"
                                onClick={handleCloseLocationModal}
                                className="text-black"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                }
            />
        </div>
    );
}
