import { type ReactElement, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import AttributeViewer from 'components/Attributes/AttributeViewer';
import CustomTable, { type TableDataRow } from 'components/CustomTable';
import StatusBadge from 'components/StatusBadge';
import Widget from 'components/Widget';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { actions as signingProfileActions, selectors as signingProfileSelectors } from 'ducks/signing-profiles';
import { type ContentSigningWorkflowDto, PlatformEnum, Resource } from 'types/openapi';
import { createWidgetDetailHeaders } from 'utils/widget';
import { permissionTitleOf } from 'components/_pages/signing-profiles/form/requestAttributePermissions';

interface Props {
    workflow: ContentSigningWorkflowDto;
    /** Profile shown. Core authorizes the connector's declarations fetch against it. */
    signingProfileUuid: string;
}

const absent = (text: string) => (
    <span key="value" className="text-content-subtle text-sm">
        {text}
    </span>
);

/** One chip per value, named by `nameOf`, with the raw value as tooltip when the name differs. */
const chips = (values: string[], nameOf: (value: string) => string = (value) => value) => (
    <div key="value" className="flex flex-wrap gap-1">
        {values.map((value) => (
            <span
                key={value}
                title={nameOf(value) === value ? undefined : value}
                className="inline-flex items-center rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs font-medium text-content-muted"
            >
                {nameOf(value)}
            </span>
        ))}
    </div>
);

/**
 * Content-signing workflow widgets: the configuration under the connector's own family and level names, and the formatting
 * connector's attribute values.
 */
export default function ContentSigningWorkflowDetail({ workflow, signingProfileUuid }: Readonly<Props>): ReactElement {
    const dispatch = useDispatch();
    const declarations = useSelector(signingProfileSelectors.signatureFormattingConnectorDeclarations);
    const levelEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.SignatureLevel));
    const listedFor = useSelector(signingProfileSelectors.contentSigningAttributesListedFor);
    const listedRequestAttributes = useSelector(signingProfileSelectors.contentSigningRequestAttributeDescriptors);
    const connector = workflow.signatureFormattingConnector;
    const { family, level } = workflow;

    useEffect(() => {
        if (connector) {
            dispatch(
                signingProfileActions.listSignatureFormattingConnectorDeclarations({ connectorUuid: connector.uuid, signingProfileUuid }),
            );
        }
    }, [dispatch, connector, signingProfileUuid]);

    useEffect(() => {
        if (connector && family && level) {
            dispatch(
                signingProfileActions.listContentSigningProfileAttributes({
                    connectorUuid: connector.uuid,
                    family,
                    level,
                    signingProfileUuid,
                }),
            );
        }
    }, [dispatch, connector, family, level, signingProfileUuid]);

    const headers = useMemo(() => createWidgetDetailHeaders(), []);

    const rows: TableDataRow[] = useMemo(() => {
        const connectorDeclarations = connector && declarations?.connectorUuid === connector.uuid ? declarations.declarations : [];
        const familyDeclaration = connectorDeclarations.find((declaration) => declaration.code === workflow.family);
        const levelName = familyDeclaration?.levels.find((declared) => declared.level === workflow.level)?.name;
        const timestampSource = workflow.timestampSource?.signingProfile;
        const extendedKeyUsages = workflow.requiredExtendedKeyUsageOids ?? [];
        const allowedRequestAttributes = workflow.allowedRequestAttributes ?? [];
        const listsThisWorkflow =
            listedFor?.connectorUuid === connector?.uuid && listedFor?.family === workflow.family && listedFor?.level === workflow.level;
        const requestAttributes = listsThisWorkflow ? listedRequestAttributes : [];

        return [
            {
                id: 'connectorName',
                columns: [
                    'Content Signing Formatting Connector',
                    connector ? (
                        <Link key="value" to={`/${Resource.Connectors.toLowerCase()}/detail/${connector.uuid}`}>
                            {connector.name}
                        </Link>
                    ) : (
                        absent('Not configured')
                    ),
                ],
            },
            { id: 'connectorUuid', columns: ['Content Signing Formatting Connector UUID', connector?.uuid ?? absent('—')] },
            {
                id: 'family',
                columns: ['Signature Family', familyDeclaration?.label ?? (workflow.family || absent('—'))],
            },
            {
                id: 'level',
                columns: ['Signature Level', levelName ?? (workflow.level ? getEnumLabel(levelEnum, workflow.level) : absent('—'))],
            },
            {
                id: 'timestampSource',
                columns: [
                    'Timestamp Source',
                    timestampSource ? (
                        <Link key="value" to={`/${Resource.SigningProfiles.toLowerCase()}/detail/${timestampSource.uuid}`}>
                            {timestampSource.name}
                        </Link>
                    ) : (
                        absent('None')
                    ),
                ],
            },
            {
                id: 'requireNonRepudiation',
                columns: ['Require Non-Repudiation', <StatusBadge key="value" enabled={workflow.requireNonRepudiation ?? false} />],
            },
            {
                id: 'requiredExtendedKeyUsages',
                columns: ['Required Extended Key Usages', extendedKeyUsages.length > 0 ? chips(extendedKeyUsages) : absent('Any')],
            },
            {
                id: 'allowedRequestAttributes',
                columns: [
                    'Allowed Request Attributes',
                    allowedRequestAttributes.length > 0
                        ? chips(allowedRequestAttributes, (name) => permissionTitleOf(name, requestAttributes))
                        : absent('None'),
                ],
            },
        ];
    }, [workflow, connector, declarations, levelEnum, listedFor, listedRequestAttributes]);

    const attributes = workflow.signatureFormattingConnectorAttributes ?? [];

    return (
        <>
            <Widget title="Content Signing Workflow Configuration" titleSize="large">
                <CustomTable headers={headers} data={rows} />
            </Widget>
            {attributes.length > 0 && (
                <Widget title="Content Signing Formatting Connector Attributes" titleSize="large">
                    <AttributeViewer attributes={attributes} />
                </Widget>
            )}
        </>
    );
}
