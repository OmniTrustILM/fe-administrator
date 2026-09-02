import Badge from 'components/Badge';
import Button from 'components/Button';
import cn from 'classnames';
import { Check, Reply, RotateCcw, Trash2 } from 'lucide-react';
import type { CommentDto } from 'types/openapi';
import { dateFormatter } from 'utils/dateUtil';
import CommentBody from './CommentBody';

type Props = {
    comment: CommentDto;
    isRoot: boolean;
    busy: boolean;
    onReply?: () => void;
    onResolve?: () => void;
    onUnresolve?: () => void;
    onDelete: () => void;
};

export default function CommentItem({ comment, isRoot, busy, onReply, onResolve, onUnresolve, onDelete }: Readonly<Props>) {
    const resolved = isRoot && comment.resolved === true;
    const uuid = comment.uuid;

    return (
        <article
            className={cn('flex flex-col gap-2 rounded-lg border border-divider px-4 py-3 bg-surface-raised', { 'opacity-75': resolved })}
            data-testid={`comment-${uuid}`}
            aria-busy={busy || undefined}
        >
            <header className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="font-semibold text-content" data-testid={`comment-${uuid}-author`}>
                        {comment.author.name}
                    </span>
                    <span className="text-content-subtle">{dateFormatter(comment.createdAt)}</span>
                    {resolved && <Badge color="success">Resolved</Badge>}
                </div>
                <div className="flex items-center gap-1">
                    {onReply && (
                        <Button
                            variant="transparent"
                            color="secondary"
                            className="!p-1"
                            title="Reply"
                            aria-label="Reply"
                            onClick={onReply}
                            disabled={busy}
                            data-testid={`comment-${uuid}-reply`}
                        >
                            <Reply size={16} />
                        </Button>
                    )}
                    {isRoot && !resolved && onResolve && (
                        <Button
                            variant="transparent"
                            color="secondary"
                            className="!p-1"
                            title="Resolve"
                            aria-label="Resolve"
                            onClick={onResolve}
                            disabled={busy}
                            data-testid={`comment-${uuid}-resolve`}
                        >
                            <Check size={16} />
                        </Button>
                    )}
                    {resolved && onUnresolve && (
                        <Button
                            variant="transparent"
                            color="secondary"
                            className="!p-1"
                            title="Reopen"
                            aria-label="Reopen"
                            onClick={onUnresolve}
                            disabled={busy}
                            data-testid={`comment-${uuid}-unresolve`}
                        >
                            <RotateCcw size={16} />
                        </Button>
                    )}
                    <Button
                        variant="transparent"
                        color="danger"
                        className="!p-1"
                        title="Delete"
                        aria-label="Delete"
                        onClick={onDelete}
                        disabled={busy}
                        data-testid={`comment-${uuid}-delete`}
                    >
                        <Trash2 size={16} />
                    </Button>
                </div>
            </header>

            <CommentBody source={comment.body} dataTestId={`comment-${uuid}-body`} />

            {resolved && comment.resolvedBy && (
                <p className="text-xs text-content-muted" data-testid={`comment-${uuid}-resolution`}>
                    Resolved by {comment.resolvedBy.name}
                    {comment.resolvedAt && ` on ${dateFormatter(comment.resolvedAt)}`}
                </p>
            )}
        </article>
    );
}
