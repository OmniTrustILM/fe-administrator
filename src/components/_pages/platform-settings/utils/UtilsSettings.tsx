import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';

import { actions as utilsActuatorActions, selectors as utilsActuatorSelectors } from 'ducks/utilsActuator';
import { actions as cbomActuatorActions, selectors as cbomActuatorSelectors } from 'ducks/cbomActuator';
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { SettingsPlatformModel } from 'types/settings';
import { AlertCircle } from 'lucide-react';

const StatusIcon = ({ ok }: { ok?: boolean }) =>
    ok ? (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <path
                d="M9.99996 18.3333C14.6025 18.3333 18.3333 14.6025 18.3333 9.99999C18.3333 5.39749 14.6025 1.66666 9.99996 1.66666C5.39746 1.66666 1.66663 5.39749 1.66663 9.99999C1.66663 14.6025 5.39746 18.3333 9.99996 18.3333Z"
                fill="#15803D"
            />
            <path d="M7.5 10L9.16667 11.6667L12.5 8.33334" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ) : (
        <AlertCircle size={16} style={{ color: 'red' }} aria-hidden="true" />
    );

type Props = {
    platformSettings?: SettingsPlatformModel;
};

const UtilsSettings = ({ platformSettings }: Props) => {
    const dispatch = useDispatch();

    const health = useSelector(utilsActuatorSelectors.health);
    const cbomHealth = useSelector(cbomActuatorSelectors.health);
    useEffect(() => {
        dispatch(utilsActuatorActions.health());
    }, [dispatch, platformSettings]);

    useEffect(() => {
        const cbomRepositoryUrl = platformSettings?.utils?.cbomRepositoryUrl;

        if (!cbomRepositoryUrl) {
            dispatch(cbomActuatorActions.reset());
            return;
        }
        dispatch(cbomActuatorActions.health(cbomRepositoryUrl));
    }, [platformSettings?.utils?.cbomRepositoryUrl, dispatch]);

    const headers: TableHeader[] = useMemo(
        () => [
            {
                id: 'setting',
                content: 'Setting',
            },
            {
                id: 'value',
                content: 'Value',
            },
        ],
        [],
    );

    const data: TableDataRow[] = useMemo(
        () =>
            platformSettings
                ? [
                      {
                          id: 'utilsUrl',
                          columns: [
                              'Utils Service URL',
                              platformSettings.utils?.utilsServiceUrl ? (
                                  <div className="flex items-center gap-1">
                                      {platformSettings.utils.utilsServiceUrl}&nbsp;
                                      <StatusIcon ok={!!health} />
                                  </div>
                              ) : (
                                  'n/a'
                              ),
                          ],
                      },
                      {
                          id: 'cbomRepositoryUrl',
                          columns: [
                              'CBOM Repository URL',
                              platformSettings.utils?.cbomRepositoryUrl ? (
                                  <div className="flex items-center gap-1">
                                      {platformSettings.utils.cbomRepositoryUrl}&nbsp;
                                      <StatusIcon ok={!!cbomHealth} />
                                  </div>
                              ) : (
                                  'n/a'
                              ),
                          ],
                      },
                  ]
                : [],
        [platformSettings, health, cbomHealth],
    );

    return (
        <div style={{ paddingTop: '1.5em', paddingBottom: '1.5em' }}>
            <CustomTable headers={headers} data={data} />
        </div>
    );
};

export default UtilsSettings;
