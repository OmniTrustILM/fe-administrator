import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import { useMemo } from 'react';
import type { SettingsPlatformModel } from 'types/settings';
import { describeTunable } from '../tunables';
import { MAX_ITEMS_PER_REQUEST } from './SigningSettings.tunables';

type Props = {
    platformSettings?: SettingsPlatformModel;
};

const headers: TableHeader[] = [
    {
        id: 'setting',
        content: 'Setting',
        width: '40%',
    },
    {
        id: 'value',
        content: 'Value',
    },
];

const SigningSettings = ({ platformSettings }: Props) => {
    const data: TableDataRow[] = useMemo(
        () =>
            platformSettings
                ? [
                      {
                          id: MAX_ITEMS_PER_REQUEST.name,
                          columns: [
                              MAX_ITEMS_PER_REQUEST.label,
                              describeTunable(MAX_ITEMS_PER_REQUEST, platformSettings.signing?.maxItemsPerRequest),
                          ],
                      },
                  ]
                : [],
        [platformSettings],
    );

    return (
        <div style={{ paddingTop: '1.5em', paddingBottom: '1.5em' }}>
            <CustomTable headers={headers} data={data} />
        </div>
    );
};

export default SigningSettings;
