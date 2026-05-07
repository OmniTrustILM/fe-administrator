import cn from 'classnames';
import { Link } from 'react-router';
import type React from 'react';

type Props = Readonly<{
    items: {
        label: string;
        href?: string;
    }[];
    title?: string;
    rightContent?: React.ReactNode;
}>;

function Breadcrumb({ items, title: titleProp, rightContent }: Props) {
    const title = titleProp || items.at(-1)?.label || '';
    return (
        <div className="mb-4 md:mb-8">
            <ol className="flex items-center whitespace-nowrap">
                {items.map((item, index) => (
                    <li
                        key={item.label}
                        className={cn('inline-flex items-center text-sm', {
                            'text-gray-700 dark:text-neutral-600': index < items.length - 1,
                        })}
                    >
                        {item.href ? <Link to={item.href}>{item.label}</Link> : <span>{item.label}</span>}
                        {index < items.length - 1 && (
                            <svg
                                className="shrink-0 size-5 text-gray-400 dark:text-neutral-600 mx-2"
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                            >
                                <path d="M6 13L10 3" stroke="currentColor" strokeLinecap="round" />
                            </svg>
                        )}
                    </li>
                ))}
            </ol>
            {(title || rightContent) && (
                <div className="mt-4 md:mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {title && <h1 className="text-2xl font-semibold">{title}</h1>}
                    {rightContent}
                </div>
            )}
        </div>
    );
}

export default Breadcrumb;
