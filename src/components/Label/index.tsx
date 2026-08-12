import cn from 'classnames';
import { Info } from 'lucide-react';
import Tooltip from 'components/Tooltip';

export type SingleValue<T> = T | undefined;
export type MultiValue<T> = T[] | undefined;

type Props = {
    htmlFor?: string;
    title?: string;
    children?: React.ReactNode;
    required?: boolean;
    className?: string;
    onClick?: () => void;
    dataTestId?: string;
    /** When set, renders an info icon after the label text that shows this text as a hover tooltip. */
    labelTooltip?: string;
};

function Label({ htmlFor, title, children, required, className, onClick, dataTestId, labelTooltip }: Readonly<Props>) {
    const defaultClasses = 'block text-left text-sm font-medium mb-2 text-center text-content';
    if (onClick) {
        return (
            <button
                type="button"
                className={cn(defaultClasses, className)}
                onClick={onClick}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onClick();
                    }
                }}
                data-testid={dataTestId ?? (htmlFor ? `label-${htmlFor}` : 'label')}
            >
                {title || children}
                {required && <span className="text-danger"> *</span>}
            </button>
        );
    }
    return (
        <label
            htmlFor={htmlFor}
            className={cn(defaultClasses, className)}
            data-testid={dataTestId ?? (htmlFor ? `label-${htmlFor}` : 'label')}
        >
            {title || children}
            {required && <span className="text-danger"> *</span>}
            {labelTooltip && (
                <Tooltip content={labelTooltip}>
                    <span
                        className="ml-1 inline-flex align-middle text-content-muted hover:text-content cursor-help"
                        data-testid={htmlFor ? `label-tooltip-${htmlFor}` : 'label-tooltip'}
                    >
                        <Info size={13} aria-hidden />
                    </span>
                </Tooltip>
            )}
        </label>
    );
}

export default Label;
