import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Select, { type OptionValue } from 'components/Select';
import Spinner from 'components/Spinner';
import { actions as signingProfileActions, selectors as signingProfileSelectors } from 'ducks/signing-profiles';
import type { SignatureLevel } from 'types/openapi';
import { formattingConnectorListError } from './formattingConnectorListError';

const connectorLabel = 'Content Signing Formatting Connector';

const clearedSelection = '';

export interface ContentSigningFormattingDraft {
    connectorUuid?: string;
    familyCode?: string;
    level?: SignatureLevel;
}

interface Props {
    value: ContentSigningFormattingDraft;
    /** Receives the new draft. A connector change clears the family and level; a family change clears the level. */
    onChange: (draft: ContentSigningFormattingDraft) => void;
    /** Profile being edited. Core authorizes the declarations fetch against it. */
    signingProfileUuid?: string;
}

/** Connector, family and level pickers for a content-signing profile. The family and level choices are those the selected connector declares. */
export default function ContentSigningFormattingFields({ value, onChange, signingProfileUuid }: Readonly<Props>) {
    const dispatch = useDispatch();
    const connectors = useSelector(signingProfileSelectors.signatureFormattingConnectors);
    const isFetchingConnectors = useSelector(signingProfileSelectors.isFetchingSignatureFormattingConnectors);
    const failedConnectorsFetch = useSelector(signingProfileSelectors.failedSignatureFormattingConnectorsFetch);
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
    const levelOptions = (familyDeclaration?.levels ?? []).map((declared) => ({ value: declared.level, label: declared.name }));

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
        familyDeclaration && level && !familyDeclaration.levels.some((declared) => declared.level === level)
            ? `${familyDeclaration.label} of ${connectorName} no longer declares the level ${level}.`
            : undefined;

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
        onChange({ connectorUuid, familyCode, level: familyDeclaration?.levels.find((declared) => declared.level === code)?.level });
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
