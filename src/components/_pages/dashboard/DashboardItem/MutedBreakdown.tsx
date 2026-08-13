type Props = Readonly<{
    title: string;
    label: string;
    value: number;
    caption: string;
}>;

function MutedBreakdown({ title, label, value, caption }: Props) {
    return (
        <div
            className="rounded-xl border border-dashed border-divider p-4 md:p-5 bg-surface-raised opacity-80"
            data-testid="muted-breakdown"
        >
            <div className="font-bold text-content mb-4">{title}</div>
            <div className="grid grid-cols-1 items-center justify-items-center gap-4 md:grid-cols-[100px_minmax(0,1fr)] md:justify-items-stretch">
                <div className="relative h-[90px] w-[90px] flex-shrink-0">
                    <div className="h-full w-full rounded-full border-[14px] border-divider" />
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-content-subtle">
                        {value}
                    </span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-md text-content-muted">{label}</span>
                    <span className="text-sm text-content-subtle">{caption}</span>
                </div>
            </div>
        </div>
    );
}

export default MutedBreakdown;
