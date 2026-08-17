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
            <div data-testid={dataTestId || 'widget-lock'} className={`${maxWidthClass} mx-auto`}>
                <div className="bg-surface-sunken border border-divider rounded-xl p-6 flex flex-col sm:flex-row items-center gap-4">
                    <div className="shrink-0 text-danger">{getIcon()}</div>
                    <div className="text-center sm:text-left">
                        <h5 className="flex justify-center sm:justify-start items-center gap-1.5 font-semibold text-content">
                            {lockTitle}
                            {lockDetails && (
                                <Tooltip content={lockDetails}>
                                    <button
                                        type="button"
                                        data-testid="widget-lock-details"
                                        className="inline-flex items-center text-content-subtle hover:text-content"
                                    >
                                        <Info size={15} />
                                    </button>
                                </Tooltip>
                            )}
                        </h5>
                        <p className="text-sm text-content mt-1">{lockText}</p>
                    </div>
                    {onRefresh && (
                        <div className="sm:ms-auto shrink-0">
                            <Button variant="outline" color="secondary" onClick={onRefresh} data-testid="widget-lock-refresh">
                                <RotateCw size={15} />
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
