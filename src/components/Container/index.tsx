import cn from 'classnames';

type Props = {
    children: React.ReactNode;
    className?: string;
    marginTop?: boolean;
    gap?: number;
    'data-testid'?: string;
};

function Container({ children, className, marginTop, gap, 'data-testid': dataTestId }: Readonly<Props>) {
    const gapClass = gap ? `gap-${gap}` : 'gap-4 md:gap-8';
    return (
        <div className={cn('flex flex-col', className, gapClass, { 'mt-4 md:mt-8': marginTop })} data-testid={dataTestId}>
            {children}
        </div>
    );
}

export default Container;
