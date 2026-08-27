import Pagination from 'components/Pagination';
import Select from 'components/Select';
import type { PagedComments } from 'ducks/comments';
import { DEFAULT_ITEMS_PER_PAGE_OPTIONS } from 'utils/pagination';

type Props = {
    page: PagedComments;
    disabled: boolean;
    onPageChange: (pageNumber: number) => void;
    onPageSizeChange: (itemsPerPage: number) => void;
    dataTestId: string;
};

const PAGE_SIZE_OPTIONS = DEFAULT_ITEMS_PER_PAGE_OPTIONS.map((option) => ({ label: option.toString(), value: option }));

/** The same footer the tables use: page size on the left, pages in the middle, the range on the right. */
export default function CommentPagination({ page, disabled, onPageChange, onPageSizeChange, dataTestId }: Readonly<Props>) {
    if (page.totalItems === 0) return null;

    const first = (page.pageNumber - 1) * page.itemsPerPage + 1;
    const last = Math.min(first + page.comments.length - 1, page.totalItems);

    return (
        <div className="flex justify-between items-center gap-2 flex-wrap" data-testid={dataTestId}>
            <Select
                id={`${dataTestId}-page-size`}
                options={PAGE_SIZE_OPTIONS}
                value={page.itemsPerPage}
                onChange={(value) => onPageSizeChange(Number(value))}
                isDisabled={disabled}
                minWidth={90}
                dataTestId={`${dataTestId}-page-size`}
            />
            {page.totalPages > 1 && (
                <Pagination
                    page={page.pageNumber}
                    totalPages={page.totalPages}
                    onPageChange={onPageChange}
                    disabled={disabled}
                    dataTestId={`${dataTestId}-pages`}
                />
            )}
            <div className="text-sm text-content-muted tabular-nums" data-testid={`${dataTestId}-summary`}>
                Showing {first} to {last} items of {page.totalItems}
            </div>
        </div>
    );
}
