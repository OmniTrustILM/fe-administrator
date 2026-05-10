import DOMPurify from 'dompurify';
import parse from 'html-react-parser';
import { marked } from 'marked';
import type React from 'react';

type AttributeInfoProps = {
    name: string;
    label: string;
    content: string | React.ReactNode;
};

export function AttributeInfo({ name, label, content }: Readonly<AttributeInfoProps>): React.ReactNode {
    const renderedContent = typeof content === 'string' ? parse(DOMPurify.sanitize(marked.parse(content) as string)) : content;

    return (
        <div
            id={`${name}Info`}
            className="flex flex-col bg-white border border-gray-200 shadow-2xs rounded-xl dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-neutral-700/70"
        >
            <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
                <h3 className="text-gray-800 dark:text-white text-sm">{label}</h3>
            </div>
            <div className="p-4 text-sm text-[var(--dark-gray-color)] server-content">{renderedContent}</div>
        </div>
    );
}
