import Spinner from 'components/Spinner';

type Props = Readonly<{
    children: React.ReactNode;
    isLoading?: boolean;
    title?: string;
    subtitle?: string;
    content?: string;
}>;

function Card({ title, subtitle, content, children, isLoading }: Props) {
    if (isLoading) {
        return (
            <div className="flex flex-col bg-white border border-gray-200 shadow-2xs rounded-xl p-4 md:p-5 dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-neutral-700/70">
                <Spinner />
            </div>
        );
    }
    return (
        <div className="flex flex-col bg-white border border-gray-200 shadow-2xs rounded-xl p-4 md:p-5 dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-neutral-700/70">
            {title && <h3 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h3>}
            {subtitle && <p className="mt-1 text-xs font-medium uppercase text-gray-500 dark:text-neutral-500">{subtitle}</p>}
            {content && <p className="mt-2 text-gray-500 dark:text-neutral-400">{content}</p>}
            {children}
        </div>
    );
}

export default Card;
