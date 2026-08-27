import parse from 'html-react-parser';
import { useMemo } from 'react';
import { renderCommentMarkdown } from 'utils/comment-markdown';

type Props = {
    source: string;
    dataTestId?: string;
};

/** Renders stored Markdown source through the comment policy. Wide content scrolls inside the body, never the page. */
export default function CommentBody({ source, dataTestId }: Readonly<Props>) {
    const rendered = useMemo(() => parse(renderCommentMarkdown(source)), [source]);
    return (
        <div className="comment-markdown text-sm text-content break-words overflow-x-auto" data-testid={dataTestId}>
            {rendered}
        </div>
    );
}
