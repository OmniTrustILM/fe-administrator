import cn from 'classnames';

export type SingleValue<T> = T | undefined;
export type MultiValue<T> = T[] | undefined;

type Props = Readonly<{
    htmlFor?: string;
    title?: string;
    children?: React.ReactNode;
    required?: boolean;
    className?: string;
    onClick?: () => void;
    dataTestId?: string;
}>;

function Label({ htmlFor, title, children, required, className, onClick, dataTestId }: Props) {
    const defaultClasses = 'block text-left text-sm font-medium mb-2 text-center dark:text-white text-[var(--dark-gray-color)]';
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
                {required && <span className="text-red-500"> *</span>}
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
            {required && <span className="text-red-500"> *</span>}
        </label>
    );
}

export default Label;
