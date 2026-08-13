import Spinner from 'components/Spinner';

type Props = {
    children: React.ReactNode;
    isLoading?: boolean;
    title?: string;
    subtitle?: string;
    content?: string;
};

function Card({ title, subtitle, content, children, isLoading }: Readonly<Props>) {
    if (isLoading) {
        return (
            <div className="flex flex-col bg-surface-raised border border-divider shadow-sm rounded-xl p-4 md:p-5">
                <Spinner />
            </div>
        );
    }
    return (
        <div className="flex flex-col bg-surface-raised border border-divider shadow-sm rounded-xl p-4 md:p-5">
            {title && <h3 className="text-lg font-bold text-content">{title}</h3>}
            {subtitle && <p className="mt-1 text-xs font-medium uppercase text-content-subtle">{subtitle}</p>}
            {content && <p className="mt-2 text-content-subtle">{content}</p>}
            {children}
        </div>
    );
}

export default Card;
