import cn from 'classnames';
import Tooltip from 'components/Tooltip';

type Props = Readonly<{
    status: boolean;
    dataTestId?: string;
}>;

function KeyStatusCircle({ status, dataTestId = 'key-status-circle' }: Props) {
    const { colorClass, text } = status
        ? { colorClass: 'bg-success-solid', text: 'Enabled' }
        : { colorClass: 'bg-danger-solid', text: 'Disabled' };

    return (
        <Tooltip content={text}>
            <span className={cn('w-3 h-3 rounded-full inline-block', colorClass)} data-testid={dataTestId}>
                <span className="sr-only">{text}</span>
            </span>
        </Tooltip>
    );
}

export default KeyStatusCircle;
