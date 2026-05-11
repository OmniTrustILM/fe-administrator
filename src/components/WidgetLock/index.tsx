import Container from 'components/Container';
import Tooltip from 'components/Tooltip';
import { LockTypeEnum } from 'types/user-interface';
import { Info, TriangleAlert, Home, Lock, Wifi, Database, Server } from 'lucide-react';

interface Props {
    size?: 'small' | 'normal' | 'large';
    lockTitle?: string;
    lockText?: string;
    lockDetails?: string;
    lockType?: LockTypeEnum;
    dataTestId?: string;
}

const WidgetLock = ({
    size = 'normal',
    lockTitle = 'There was some problem',
    lockText = 'There was some issue please try again later',
    lockType = LockTypeEnum.GENERIC,
    lockDetails,
    dataTestId,
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
                <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-4">
                    <div className="shrink-0 text-[var(--status-danger-color)] dark:text-neutral-400">{getIcon()}</div>
                    <div className="text-center sm:text-left">
                        <h5 className="flex justify-center sm:justify-start items-center gap-1.5 font-semibold text-[var(--dark-gray-color)] dark:text-neutral-200">
                            {lockTitle}
                            {lockDetails && (
                                <Tooltip content={lockDetails}>
                                    <button
                                        type="button"
                                        className="inline-flex items-center text-[var(--gray-400)] hover:text-[var(--dark-gray-color)] dark:text-neutral-500 dark:hover:text-neutral-300"
                                    >
                                        <Info size={15} />
                                    </button>
                                </Tooltip>
                            )}
                        </h5>
                        <p className="text-sm text-[var(--dark-gray-color)] dark:text-neutral-400 mt-1">{lockText}</p>
                    </div>
                </div>
            </div>
        </Container>
    );
};

export default WidgetLock;
