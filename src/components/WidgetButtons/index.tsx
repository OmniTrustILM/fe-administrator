import cn from 'classnames';
import type React from 'react';
import Button from 'components/Button';
import type { IconName } from 'types/icons';
import { iconRegistry } from 'utils/icons';

export interface WidgetButtonProps {
    icon: IconName;
    id?: string;
    tooltip?: string;
    disabledTooltip?: string;
    disabled: boolean;
    custom?: React.ReactNode;
    onClick: (event: React.MouseEvent) => void;
    className?: string;
}

type Props = {
    buttons: WidgetButtonProps[];
    justify?: 'start' | 'end' | 'center';
    className?: string;
};

function WidgetButtons({ buttons, justify = 'center', className }: Readonly<Props>) {
    return (
        <div
            className={cn(
                'flex ml-2 items-center gap-1',
                {
                    'justify-start': justify === 'start',
                    'justify-center': justify === 'center',
                    'justify-end': justify === 'end',
                },
                className,
            )}
        >
            {buttons.map((button, index) => {
                const key = button.id || `${button.icon}-${index}`;
                const Icon = iconRegistry[button.icon];

                return button.custom ? (
                    <span key={key}>{button.custom}</span>
                ) : (
                    <Button
                        key={key}
                        variant="transparent"
                        className={button.className}
                        data-testid={`${button.id ?? button.icon}-button`}
                        title={button.tooltip}
                        disabledTooltip={button.disabledTooltip}
                        onClick={button.onClick}
                        disabled={button.disabled}
                    >
                        {Icon && <Icon size={16} />}
                    </Button>
                );
            })}
        </div>
    );
}

export default WidgetButtons;
