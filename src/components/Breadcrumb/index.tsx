import cn from 'classnames';
import { Link } from 'react-router';
import type React from 'react';

type Props = {
    items: {
        label: string;
        href?: string;
    }[];
    title?: string;
    rightContent?: React.ReactNode;
};

function Breadcrumb({ items, title: titleProp, rightContent }: Readonly<Props>) {
    const title = titleProp || items.at(-1)?.label || '';
    return (
        <div className="mb-4 md:mb-8">
            <ol className="flex items-center whitespace-nowrap">
                {items.map((item, index) => (
                    <li
                        key={item.label}
                        className={cn('inline-flex items-center text-sm', {
                            'shrink-0 text-content-muted': index < items.length - 1,
                            'min-w-0': index === items.length - 1,
                        })}
                    >
                        {item.href ? (
                            <Link className="truncate" to={item.href}>
                                {item.label}
                            </Link>
                        ) : (
                            <span className="truncate" title={item.label}>
                                {item.label}
                            </span>
                        )}
                        {index < items.length - 1 && (
                            <svg
                                className="shrink-0 size-5 text-content-subtle mx-2"
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
                <div className="mt-4 md:mt-8 flex min-w-0 flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {title && (
                        <h1 className="min-w-0 text-2xl font-semibold break-words line-clamp-2" title={title}>
                            {title}
                        </h1>
                    )}
                    {rightContent}
                </div>
            )}
        </div>
    );
}

export default Breadcrumb;
