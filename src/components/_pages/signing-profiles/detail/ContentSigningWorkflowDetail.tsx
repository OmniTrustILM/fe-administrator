import { type ReactElement, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import AttributeViewer from 'components/Attributes/AttributeViewer';
import CustomTable, { type TableDataRow } from 'components/CustomTable';
import Widget from 'components/Widget';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { actions as signingProfileActions, selectors as signingProfileSelectors } from 'ducks/signing-profiles';
import { type ContentSigningWorkflowDto, PlatformEnum, Resource } from 'types/openapi';
import { createWidgetDetailHeaders } from 'utils/widget';
import { absent, certificatePurposeRows } from './certificatePurposeRows';

interface Props {
    workflow: ContentSigningWorkflowDto;
    /** Profile shown. Core authorizes the connector's declarations fetch against it. */
    signingProfileUuid: string;
}

/**
 * Content-signing workflow widgets: the configuration under the connector's own family and level names, and the formatting
 * connector's attribute values.
 */
export default function ContentSigningWorkflowDetail({ workflow, signingProfileUuid }: Readonly<Props>): ReactElement {
    const dispatch = useDispatch();
    const declarations = useSelector(signingProfileSelectors.signatureFormattingConnectorDeclarations);
    const levelEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.SignatureLevel));
    const connector = workflow.signatureFormattingConnector;

    useEffect(() => {
        if (connector) {
            dispatch(
                signingProfileActions.listSignatureFormattingConnectorDeclarations({ connectorUuid: connector.uuid, signingProfileUuid }),
            );
        }
    }, [dispatch, connector, signingProfileUuid]);

    const headers = useMemo(() => createWidgetDetailHeaders(), []);

    const rows: TableDataRow[] = useMemo(() => {
        const connectorDeclarations = connector && declarations?.connectorUuid === connector.uuid ? declarations.declarations : [];
        const familyDeclaration = connectorDeclarations.find((declaration) => declaration.code === workflow.family);
        const levelName = familyDeclaration?.levels.find((declared) => declared.level === workflow.level)?.name;
        const timestampSource = workflow.timestampSource?.signingProfile;

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
            ...certificatePurposeRows(workflow),
        ];
    }, [workflow, connector, declarations, levelEnum]);

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
