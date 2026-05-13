import * as RadixDialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
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

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type ModalIconName =
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
    | 'plug';
export type ModalIcon = ModalIconName | React.ReactElement | null | undefined;

export interface DialogButton {
    key?: string;
    color: ButtonColor;
    body: string | React.ReactNode;
    onClick: (formData?: any) => void;
    disabled?: boolean;
    variant?: ButtonVariant;
}

type Props = {
    isOpen: boolean;
    toggle?: () => void;
    caption?: string | React.ReactNode;
    body?: string | React.ReactNode;
    buttons?: DialogButton[];
    size?: ModalSize;
    dataTestId?: string;
    icon?: ModalIcon;
    noBorder?: boolean;
};

const sizeClasses: Record<ModalSize, string> = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-xl',
    xl: 'sm:max-w-4xl',
    xxl: 'sm:max-w-6xl',
};

export default function Dialog({
    isOpen,
    toggle,
    caption,
    body,
    buttons,
    size = 'sm',
    dataTestId,
    icon,
    noBorder = false,
}: Readonly<Props>) {
    const renderIcon = () => {
        if (!icon) return null;
        const iconColor: Record<string, string> = {
            delete: '#991B1B',
            destroy: '#991B1B',
            warning: '#991B1B',
            check: '#115E59',
        };
        let iconElement: React.ReactNode = null;
        const buttonProps = { size: 26, strokeWidth: 1 };
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
                style={{ color: iconColor[icon as string] || '#6B7280' }}
            >
                {iconElement}
            </div>
        );
    };

    const hideBorders = icon === 'delete' || icon === 'destroy' || noBorder;

    const titleNode =
        caption == null || caption === '' ? (
            <VisuallyHidden asChild>
                <RadixDialog.Title>Dialog</RadixDialog.Title>
            </VisuallyHidden>
        ) : (
            <RadixDialog.Title asChild>
                <h3 className="font-bold text-[var(--dark-gray-color)] dark:text-white text-2xl">{caption}</h3>
            </RadixDialog.Title>
        );

    return (
        <RadixDialog.Root
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) toggle?.();
            }}
        >
            <RadixDialog.Portal>
                <RadixDialog.Overlay data-testid="dialog-overlay" className="fixed inset-0 z-[80] bg-black/50" />
                <RadixDialog.Content
                    data-testid={dataTestId}
                    className={cn(
                        'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-full',
                        sizeClasses[size],
                        'bg-white border border-gray-200 shadow-2xs rounded-xl',
                        'dark:bg-neutral-800 dark:border-neutral-700 dark:shadow-neutral-700/70',
                        'flex flex-col p-4 md:p-8 !pb-0 overflow-hidden max-h-[calc(100vh-56px)]',
                    )}
                >
                    <RadixDialog.Close asChild>
                        <Button variant="transparent" title="Close" className="absolute right-2 top-2">
                            <X size={16} />
                            <span className="sr-only">Close</span>
                        </Button>
                    </RadixDialog.Close>
                    <div
                        className={cn('flex flex-col justify-center dark:border-neutral-700', {
                            'border-b border-gray-200 pb-4': !hideBorders,
                            'items-center': !!icon,
                        })}
                    >
                        {renderIcon()}
                        {titleNode}
                    </div>
                    <RadixDialog.Description asChild>
                        <div
                            className={cn('pt-4 text-gray-500 dark:text-white overflow-y-auto min-h-0', {
                                'pb-4': !!buttons?.length,
                                'text-center': icon === 'delete' || icon === 'destroy',
                            })}
                        >
                            {body}
                        </div>
                    </RadixDialog.Description>
                    {buttons && buttons.length > 0 && (
                        <div className="flex justify-end items-center gap-4 py-4 mt-2 dark:border-neutral-700 modal-footer">
                            {buttons.map((button, index) => (
                                <Button
                                    key={button.key ?? index}
                                    color={button.color}
                                    onClick={() => button.onClick()}
                                    disabled={button.disabled || false}
                                    variant={button.variant}
                                >
                                    {button.body}
                                </Button>
                            ))}
                        </div>
                    )}
                </RadixDialog.Content>
            </RadixDialog.Portal>
        </RadixDialog.Root>
    );
}
