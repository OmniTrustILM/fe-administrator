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
        <div id={`${name}Info`} className="flex flex-col bg-surface-raised border border-divider shadow-2xs rounded-xl">
            <div className="p-4 border-b border-divider">
                <h3 className="text-content text-sm">{label}</h3>
            </div>
            <div className="p-4 text-sm text-content server-content">{renderedContent}</div>
        </div>
    );
}
