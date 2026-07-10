type Props = Readonly<{
    errors: string[];
    title?: string;
}>;

export default function ComplianceErrorsPanel({ errors, title = 'Compliance errors' }: Props) {
    const uniqueErrors = [...new Set(errors)];

    if (uniqueErrors.length === 0) return null;

    return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4" data-testid="compliance-errors-panel" role="alert">
            <h6 className="mb-2 text-sm font-semibold text-red-700">{title}</h6>
            <ul className="list-disc space-y-1 ps-5 text-sm text-red-700">
                {uniqueErrors.map((error) => (
                    <li key={error}>{error}</li>
                ))}
            </ul>
        </div>
    );
}
