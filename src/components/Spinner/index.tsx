import cn from 'classnames';
type Props = {
    active?: boolean;
    color?: 'light' | 'primary';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    dataTestId?: string;
};

function Spinner({ active = true, color = 'primary', size = 'md', dataTestId }: Readonly<Props>) {
    if (!active) return null;

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <output
                data-testid={dataTestId || 'spinner'}
                className={cn('animate-spin inline-block border-3 border-current border-t-transparent text-brand rounded-full', {
                    'size-4': size === 'sm',
                    'size-6': size === 'md',
                    'size-8': size === 'lg',
                    'size-10': size === 'xl',
                    'text-brand': color === 'primary',
                    'text-content-on-brand': color === 'light',
                })}
                aria-label="loading"
            >
                <span className="sr-only">Loading...</span>
            </output>
        </div>
    );
}

export default Spinner;
