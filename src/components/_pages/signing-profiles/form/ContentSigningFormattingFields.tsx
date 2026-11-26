import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Select, { type OptionValue } from 'components/Select';
import Spinner from 'components/Spinner';
import { actions as signingProfileActions, selectors as signingProfileSelectors } from 'ducks/signing-profiles';
import { type SignatureLevel, SigningWorkflowType } from 'types/openapi';
import { formattingConnectorListError } from './formattingConnectorListError';

const connectorLabel = 'Content Signing Formatting Connector';

const clearedSelection = '';

const contentSigningConnectorList = signingProfileSelectors.signatureFormattingConnectorListFor(SigningWorkflowType.ContentSigning);

export interface ContentSigningFormattingDraft {
    connectorUuid?: string;
    familyCode?: string;
    level?: SignatureLevel;
}

interface Props {
    value: ContentSigningFormattingDraft;
    /**
     * Receives the new draft. A connector change clears the family and level, and a family change clears the level;
     * an empty family or level then takes the sole choice the connector declares.
     */
    onChange: (draft: ContentSigningFormattingDraft) => void;
    /** Receives the family or level the loaded declarations lack, or nothing while they load, fail or declare the choice. */
    onSelectionErrorChange?: (error: string | undefined) => void;
    /** Profile being edited. Core authorizes the declarations fetch against it. */
    signingProfileUuid?: string;
}

/** Connector, family and level pickers for a content-signing profile. The family and level choices are those the selected connector declares. */
export default function ContentSigningFormattingFields({ value, onChange, onSelectionErrorChange, signingProfileUuid }: Readonly<Props>) {
    const dispatch = useDispatch();
    const { connectors, isFetching: isFetchingConnectors, failure: failedConnectorsFetch } = useSelector(contentSigningConnectorList);
    const declarations = useSelector(signingProfileSelectors.signatureFormattingConnectorDeclarations);
    const isFetchingDeclarations = useSelector(signingProfileSelectors.isFetchingSignatureFormattingConnectorDeclarations);
    const failedDeclarationsFetch = useSelector(signingProfileSelectors.failedSignatureFormattingConnectorDeclarationsFetch);

    const { connectorUuid, familyCode, level } = value;

    useEffect(() => {
        if (!connectorUuid) return;
        dispatch(signingProfileActions.listSignatureFormattingConnectorDeclarations({ connectorUuid, signingProfileUuid }));
    }, [dispatch, connectorUuid, signingProfileUuid]);

    const connectorName = connectors.find((connector) => connector.uuid === connectorUuid)?.name ?? connectorUuid;
    const declarationsLoaded = connectorUuid !== undefined && declarations?.connectorUuid === connectorUuid;
    const connectorDeclarations = declarationsLoaded ? declarations.declarations : [];
    const familyDeclaration = connectorDeclarations.find((declaration) => declaration.code === familyCode);

    const connectorOptions = connectors.map((connector) => ({ value: connector.uuid, label: connector.name }));
    if (connectorUuid && !connectors.some((connector) => connector.uuid === connectorUuid)) {
        connectorOptions.push({ value: connectorUuid, label: connectorUuid });
    }
    const familyOptions = connectorDeclarations.map((declaration) => ({ value: declaration.code, label: declaration.label }));
    const declaredLevels = familyDeclaration?.levels ?? [];
    const levelOptions = declaredLevels.map((declared) => ({ value: declared.level, label: declared.name }));
    const soleFamilyCode = connectorDeclarations.length === 1 ? connectorDeclarations[0].code : undefined;
    const soleLevel = declaredLevels.length === 1 ? declaredLevels[0].level : undefined;

    useEffect(() => {
        if (!familyCode && soleFamilyCode) onChange({ connectorUuid, familyCode: soleFamilyCode });
        else if (familyDeclaration && !level && soleLevel) onChange({ connectorUuid, familyCode, level: soleLevel });
    }, [onChange, connectorUuid, familyCode, familyDeclaration, level, soleFamilyCode, soleLevel]);

    let declarationsError: string | undefined;
    if (connectorUuid && failedDeclarationsFetch?.connectorUuid === connectorUuid) {
        declarationsError = `The declarations of ${connectorName} could not be read. ${failedDeclarationsFetch.reason ?? ''}`.trim();
    } else if (declarationsLoaded && connectorDeclarations.length === 0) {
        declarationsError = `${connectorName} declares no signature family.`;
    }
    const connectorErrors = [formattingConnectorListError(connectorLabel, failedConnectorsFetch), declarationsError].filter(Boolean);
    const connectorError = connectorErrors.length > 0 ? connectorErrors.join(' ') : undefined;
    const familyError =
        declarationsLoaded && familyCode && !familyDeclaration
            ? `${connectorName} no longer declares the family ${familyCode}.`
            : undefined;
    const levelError =
        familyDeclaration && level && !declaredLevels.some((declared) => declared.level === level)
            ? `${familyDeclaration.label} of ${connectorName} no longer declares the level ${level}.`
            : undefined;
    const selectionError = familyError ?? levelError;

    useEffect(() => {
        onSelectionErrorChange?.(selectionError);
    }, [onSelectionErrorChange, selectionError]);

    const selectConnector = (selected: SelectEmission) => {
        const next = selectedCodeOrUndefined(selected);
        if (next !== connectorUuid) onChange({ connectorUuid: next });
    };
    const selectFamily = (selected: SelectEmission) => {
        const next = selectedCodeOrUndefined(selected);
        if (next !== familyCode) onChange({ connectorUuid, familyCode: next });
    };
    const selectLevel = (selected: SelectEmission) => {
        const code = selectedCodeOrUndefined(selected);
        onChange({ connectorUuid, familyCode, level: declaredLevels.find((declared) => declared.level === code)?.level });
    };

    return (
        <div className="space-y-4">
            <Select
                id="contentSigningFormattingConnector"
                label={connectorLabel}
                required
                value={connectorUuid ?? clearedSelection}
                onChange={selectConnector}
                options={connectorOptions}
                placeholder="Select a connector…"
                isClearable
                isDisabled={isFetchingConnectors}
                placement="bottom"
                error={connectorError}
            />
            <div className="relative space-y-4">
                <Select
                    id="signatureFamily"
                    label="Signature Family"
                    required
                    value={familyCode ?? clearedSelection}
                    onChange={selectFamily}
                    options={familyOptions}
                    placeholder="Select a family…"
                    placement="bottom"
                    error={familyError}
                />
                <Select
                    id="signatureLevel"
                    label="Signature Level"
                    required
                    value={level ?? clearedSelection}
                    onChange={selectLevel}
                    options={levelOptions}
                    placeholder="Select a level…"
                    placement="bottom"
                    error={levelError}
                />
                <Spinner active={isFetchingDeclarations} />
            </div>
        </div>
    );
}

type SelectEmission = OptionValue | { value: OptionValue } | null;

function selectedCodeOrUndefined(selected: SelectEmission): string | undefined {
    return typeof selected === 'string' && selected !== clearedSelection ? selected : undefined;
}
