import Button from 'components/Button';
import Container from 'components/Container';
import Tooltip from 'components/Tooltip';
import { LockTypeEnum } from 'types/user-interface';
import { Info, TriangleAlert, Home, Lock, Wifi, Database, Server, RotateCw } from 'lucide-react';

interface Props {
    size?: 'small' | 'normal' | 'large';
    lockTitle?: string;
    lockText?: string;
    lockDetails?: string;
    lockType?: LockTypeEnum;
    dataTestId?: string;
    onRefresh?: () => void;
    refreshLabel?: string;
}

const WidgetLock = ({
    size = 'normal',
    lockTitle = 'There was some problem',
    lockText = 'There was some issue please try again later',
    lockType = LockTypeEnum.GENERIC,
    lockDetails,
    dataTestId,
    onRefresh,
    refreshLabel = 'Retry',
}: Props) => {
    const smallIconSize = size === 'small' ? 24 : 32;
    const iconSize = size === 'large' ? 48 : smallIconSize;

    const getIcon = () => {
        switch (lockType) {
            case LockTypeEnum.CLIENT:
                return <Home size={iconSize} />;
            case LockTypeEnum.PERMISSION:
                return <Lock size={iconSize} />;
            case LockTypeEnum.NETWORK:
                return <Wifi size={iconSize} />;
            case LockTypeEnum.SERVICE_ERROR:
                return <Database size={iconSize} />;
            case LockTypeEnum.SERVER_ERROR:
                return <Server size={iconSize} />;
            default:
                return <TriangleAlert size={iconSize} />;
        }
    };

    const normalOrLargeClass = size === 'normal' ? 'max-w-xl' : 'max-w-full';
    const maxWidthClass = size === 'small' ? 'max-w-md' : normalOrLargeClass;

    return (
        <Container>
            {/* Container query, not `sm:`: the lock is dropped into narrow cards (a dashboard count
                badge is ~240px) on wide viewports, where a viewport breakpoint keeps the row layout
                and squeezes the text to one word per line while the un-shrinkable icon and button
                push the panel out past its card. `min-w-0` lets the text block shrink. */}
            <div data-testid={dataTestId || 'widget-lock'} className={`${maxWidthClass} w-full mx-auto @container`}>
                <div className="bg-surface-sunken border border-divider rounded-xl p-6 flex flex-col @md:flex-row items-center gap-4">
                    <div className="shrink-0 text-danger">{getIcon()}</div>
                    <div className="min-w-0 text-center @md:text-left">
                        <h5 className="flex flex-wrap justify-center @md:justify-start items-center gap-1.5 font-semibold text-content">
                            {lockTitle}
                            {lockDetails && (
                                <Tooltip content={lockDetails}>
                                    <button
                                        type="button"
                                        aria-label="Show details"
                                        data-testid="widget-lock-details"
                                        className="inline-flex items-center rounded-full text-content-subtle hover:text-content focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                                    >
                                        <Info size={15} aria-hidden />
                                    </button>
                                </Tooltip>
                            )}
                        </h5>
                        <p className="text-sm text-content mt-1">{lockText}</p>
                    </div>
                    {onRefresh && (
                        <div className="@md:ms-auto shrink-0">
                            <Button variant="outline" color="secondary" onClick={onRefresh} data-testid="widget-lock-refresh">
                                <RotateCw size={15} aria-hidden />
                                {refreshLabel}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Container>
    );
};

export default WidgetLock;
