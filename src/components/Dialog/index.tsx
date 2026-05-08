import cn from 'classnames';
import Button, { type ButtonColor, type ButtonVariant } from 'components/Button';
import {
    Trash2,
    Info,
    AlertTriangle,
    X,
    ArrowUpFromLine,
    Users,
    User,
    UserCheck,
    CircleMinus,
    ArrowDownToLine,
    Repeat2,
    Shuffle,
    SquareMinus,
    Check,
    Plug,
    ShieldCheck,
} from 'lucide-react';
import { useLayoutEffect } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type ModalIcon =
    | 'delete'
    | 'destroy'
    | 'info'
    | 'warning'
    | 'check'
    | 'upload'
    | 'users'
    | 'user'
    | 'user-check'
    | 'shield-check'
    | 'download'
    | 'refresh'
    | 'shuffle'
    | 'minus'
    | 'plug'
    | Exclude<React.ReactNode, string>;

export interface DialogButton {
    key?: string;
    color: ButtonColor;
    body: string | React.ReactNode;
    onClick: (formData?: any) => void;
    disabled?: boolean;
    variant?: ButtonVariant;
}

type Props = Readonly<{
    isOpen: boolean;
    toggle?: () => void;
    caption?: string | React.ReactNode;
    body?: string | React.ReactNode;
    buttons?: DialogButton[];
    size?: ModalSize;
    dataTestId?: string;
    icon?: ModalIcon;
    noBorder?: boolean;
}>;

export default function Dialog({ isOpen, toggle, caption, body, buttons, size = 'sm', dataTestId, icon, noBorder = false }: Props) {
    const sizeClasses = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-lg',
        lg: 'sm:max-w-xl',
        xl: 'sm:max-w-4xl',
        xxl: 'sm:max-w-6xl',
    };

    // Lock body scroll when modal is open
    useLayoutEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const renderIcon = () => {
        if (!icon) return null;
        const iconColor = {
            delete: '#991B1B',
            destroy: '#991B1B',
            warning: '#991B1B',
            check: '#115E59',
        };
        let iconElement = null;
        const buttonProps = {
            size: 26,
            strokeWidth: 1,
        };
        switch (icon) {
            case 'delete':
                iconElement = <Trash2 {...buttonProps} />;
                break;
            case 'info':
                iconElement = <Info {...buttonProps} />;
                break;
            case 'warning':
                iconElement = <AlertTriangle {...buttonProps} />;
                break;
            case 'upload':
                iconElement = <ArrowUpFromLine {...buttonProps} />;
                break;
            case 'users':
                iconElement = <Users {...buttonProps} />;
                break;
            case 'user':
                iconElement = <User {...buttonProps} />;
                break;
            case 'user-check':
                iconElement = <UserCheck {...buttonProps} />;
                break;
            case 'shield-check':
                iconElement = <ShieldCheck {...buttonProps} />;
                break;
            case 'destroy':
                iconElement = <CircleMinus {...buttonProps} />;
                break;
            case 'download':
                iconElement = <ArrowDownToLine {...buttonProps} />;
                break;
            case 'refresh':
                iconElement = <Repeat2 {...buttonProps} />;
                break;
            case 'shuffle':
                iconElement = <Shuffle {...buttonProps} />;
                break;
            case 'minus':
                iconElement = <SquareMinus {...buttonProps} />;
                break;
            case 'check':
                iconElement = <Check {...buttonProps} />;
                break;
            case 'plug':
                iconElement = <Plug {...buttonProps} />;
                break;
            default:
                iconElement = icon as React.ReactNode;
                break;
        }

        return (
            <div
                className={cn(
                    'w-12 h-12 m-2 mb-4 bg-current/12 rounded-full flex items-center justify-center relative z-1 after:content-[""] after:absolute after:w-16 after:h-16 after:bg-current/6 after:rounded-full after:-z-10 after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2',
                    {
                        '!bg-[#CCFBF1] after:!bg-[#CCFBF1] after:!opacity-30': icon === 'check',
                    },
                )}
                style={{ color: iconColor[icon as keyof typeof iconColor] || '#6B7280' }}
            >
                {iconElement}
            </div>
        );
    };

    const hideBorders = icon === 'delete' || icon === 'destroy' || noBorder;

    return (
        <div
            id="hs-scale-animation-modal"
            className={cn(
                'hs-overlay size-full fixed top-0 start-0 z-[80] overflow-x-hidden overflow-y-auto',
                {
                    hidden: !isOpen,
                    'pointer-events-auto': isOpen,
                    'pointer-events-none': !isOpen,
                },
                isOpen &&
                    'after:content-[""] after:fixed after:inset-0 after:bg-black/50 after:transition-opacity after:duration-200 after:-z-[1]',
            )}
            role="dialog"
            tabIndex={-1}
            aria-labelledby="hs-scale-animation-modal-label"
            data-testid={dataTestId}
        >
            <div
                className={cn(
                    'hs-overlay-animation-target ease-in-out transition-all duration-200 m-3 sm:mx-auto min-h-[calc(100%-56px)] flex items-center',
                    sizeClasses[size || 'sm'],
                    {
                        'scale-100 opacity-100': isOpen,
                        'scale-95 opacity-0': !isOpen,
                    },
                )}
            >
                <div className="w-full flex flex-col bg-white border border-gray-200 shadow-2xs rounded-xl pointer-events-auto dark:bg-neutral-800 dark:border-neutral-700 dark:shadow-neutral-700/70 p-4 md:p-8 !pb-0 relative overflow-visible">
                    <Button variant="transparent" onClick={toggle} title="Close" className="absolute right-2 top-2">
                        <X size={16} />
                    </Button>
                    <div
                        className={cn('flex flex-col justify-center dark:border-neutral-700', {
                            'border-b border-gray-200 pb-4': !hideBorders,
                            'items-center': !!icon,
                        })}
                    >
                        {renderIcon()}
                        <h3
                            id="hs-scale-animation-modal-label"
                            className="font-bold text-[var(--dark-gray-color)] dark:text-white text-2xl"
                        >
                            {caption}
                        </h3>
                    </div>
                    <div
                        className={cn('pt-4 text-gray-500 dark:text-white overflow-visible', {
                            'pb-4': !!buttons?.length,
                            'text-center': icon === 'delete' || icon === 'destroy',
                        })}
                    >
                        {body}
                    </div>
                    {buttons && buttons.length > 0 && (
                        <div className={cn('flex justify-end items-center gap-4 py-4 mt-2 dark:border-neutral-700 modal-footer')}>
                            {buttons.map((button, index) => (
                                <Button
                                    key={button.key ?? index}
                                    color={button.color}
                                    onClick={() => button.onClick()}
                                    disabled={button.disabled || false}
                                    data-hs-overlay="#hs-scale-animation-modal"
                                    variant={button.variant}
                                >
                                    {button.body}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
