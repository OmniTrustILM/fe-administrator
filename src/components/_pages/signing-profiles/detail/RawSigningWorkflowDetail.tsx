import { type ReactElement, useMemo } from 'react';
import CustomTable from 'components/CustomTable';
import Widget from 'components/Widget';
import type { RawSigningWorkflowDto } from 'types/openapi';
import { createWidgetDetailHeaders } from 'utils/widget';
import { certificatePurposeRows } from './certificatePurposeRows';

interface Props {
    workflow: RawSigningWorkflowDto;
}

/** Raw-signing workflow widget. Raw signing has no formatting, so it shows only the certificate purpose. */
export default function RawSigningWorkflowDetail({ workflow }: Readonly<Props>): ReactElement {
    const headers = useMemo(() => createWidgetDetailHeaders(), []);
    const rows = useMemo(() => certificatePurposeRows(workflow), [workflow]);

    return (
        <Widget title="Raw Signing Workflow Configuration" titleSize="large">
            <CustomTable headers={headers} data={rows} />
        </Widget>
    );
}
