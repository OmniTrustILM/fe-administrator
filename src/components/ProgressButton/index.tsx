import cn from 'classnames';
import Button, { type ButtonColor } from 'components/Button';
import Spinner from 'components/Spinner';

type Props = Readonly<{
    disabled?: boolean;
    inProgress: boolean | undefined;
    title: string;
    inProgressTitle?: string;
    color?: ButtonColor;
    className?: string;
    type?: 'submit' | 'reset' | 'button';
    onClick?: () => void;
    dataTestId?: string;
}>;

function ProgressButton({
    inProgress,
    title,
    inProgressTitle = title,
    disabled = false,
    color = 'primary',
    type = 'submit',
    onClick,
    dataTestId,
}: Props) {
    const buttonProps = {
        color,
        disabled: disabled || inProgress,
        onClick,
        className: cn('relative', { 'opacity-50': inProgress }),
        type,
        'data-testid': dataTestId || 'progress-button',
    } as any;

    return (
        <Button {...buttonProps}>
            {inProgress ? (
                <div>
                    <Spinner color="light" size="sm" />
                    {inProgressTitle}
                </div>
            ) : (
                title
            )}
        </Button>
    );
}

export default ProgressButton;
