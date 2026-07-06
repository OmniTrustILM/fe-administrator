import cn from 'classnames';
import Button, { type ButtonColor, type Props as ButtonProps } from 'components/Button';
import Spinner from 'components/Spinner';

type Props = {
    disabled?: boolean;
    inProgress: boolean | undefined;
    title: string;
    inProgressTitle?: string;
    color?: ButtonColor;
    className?: string;
    type?: 'submit' | 'reset' | 'button';
    onClick?: () => void;
    dataTestId?: string;
};

function ProgressButton({
    inProgress,
    title,
    inProgressTitle = title,
    disabled = false,
    color = 'primary',
    type = 'submit',
    onClick,
    dataTestId,
}: Readonly<Props>) {
    const buttonProps: ButtonProps = {
        color,
        disabled: disabled || inProgress,
        onClick,
        className: cn('relative', { 'opacity-50': inProgress }),
        type,
        'data-testid': dataTestId || 'progress-button',
    };

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
