import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import { actions, selectors } from 'ducks/info';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCopyToClipboard } from 'utils/common-hooks';
import Button from 'components/Button';
import { Copy } from 'lucide-react';
import packageJson from '../../../../package.json';

type PlatformInfoDialogLinkProps = {
    initiallyOpen?: boolean;
    forceOpen?: boolean;
};

const PlatformInfoDialogLink = ({ initiallyOpen = false, forceOpen }: PlatformInfoDialogLinkProps) => {
    const dispatch = useDispatch();
    const [isOpenState, setIsOpenState] = useState(initiallyOpen);
    const isOpen = forceOpen ?? isOpenState;

    const platformInfo = useSelector(selectors.platformInfo);
    const isFetching = useSelector(selectors.isFetching);

    const copyToClipboard = useCopyToClipboard();

    useEffect(() => {
        if (!isOpen) return;
        dispatch(actions.getPlatformInfo());
    }, [dispatch, isOpen]);

    const headers: TableHeader[] = useMemo(
        () => [
            {
                id: 'component',
                content: 'Component',
            },
            {
                id: 'version',
                content: 'Version',
            },
            {
                id: 'buildTime',
                content: 'Build time',
            },
        ],
        [],
    );

    const buildTimeFormatted =
        typeof __BUILD_TIME__ !== 'undefined'
            ? new Date(__BUILD_TIME__).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
              })
            : '—';

    const coreBuildTimeFormatted = platformInfo?.build?.timestamp
        ? new Date(platformInfo?.build?.timestamp).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
          })
        : '—';

    const data: TableDataRow[] = useMemo(
        () =>
            !platformInfo
                ? []
                : [
                      {
                          id: 'app',
                          columns: [platformInfo.app.name, platformInfo.app.version, coreBuildTimeFormatted],
                      },
                      {
                          id: 'frontend',
                          columns: ['ILM Frontend', packageJson.version, buildTimeFormatted],
                      },
                      {
                          id: 'db',
                          columns: [platformInfo.db.system, platformInfo.db.version, ''],
                      },
                  ],
        [platformInfo, buildTimeFormatted, coreBuildTimeFormatted],
    );

    const copyText = platformInfo
        ? `${platformInfo.app.name}: ${platformInfo.app.version} (${coreBuildTimeFormatted})\nILM Frontend: ${packageJson.version} (${buildTimeFormatted})\n${platformInfo.db.system}: ${platformInfo.db.version}`
        : '';

    return (
        <>
            <button
                type="button"
                className="text-blue-600 bg-transparent border-0 p-0 cursor-pointer font-inherit"
                data-testid="footer-version-info-link"
                onClick={() => setIsOpenState(true)}
            >
                Version Info
            </button>
            <Dialog
                isOpen={isOpen}
                caption="Platform versions info"
                toggle={() => setIsOpenState(false)}
                body={
                    <div>
                        <CustomTable data={data} headers={headers} isLoading={isFetching} />
                        {!isFetching && platformInfo && (
                            <div>
                                Click to copy:{' '}
                                <Button
                                    className="mt-2"
                                    variant="transparent"
                                    title="Version Info"
                                    onClick={() =>
                                        copyToClipboard(
                                            copyText,
                                            'Platform version info was copied to clipboard',
                                            'Failed to copy platform version info to clipboard',
                                        )
                                    }
                                >
                                    <Copy size={16} />
                                </Button>
                            </div>
                        )}
                    </div>
                }
                size="lg"
                icon="info"
                dataTestId="platform-info-dialog"
                buttons={[
                    {
                        color: 'secondary',
                        body: 'Close',
                        variant: 'outline',
                        onClick: () => setIsOpenState(false),
                    },
                ]}
            />
        </>
    );
};

export default PlatformInfoDialogLink;
