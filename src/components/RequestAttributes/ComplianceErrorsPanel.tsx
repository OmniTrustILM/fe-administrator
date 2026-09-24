type Severity = 'error' | 'warning';

type Props = Readonly<{
    messages: string[];
    severity?: Severity;
    title?: string;
    description?: string;
}>;

const severityStyles: Record<Severity, { container: string; text: string; role: 'alert' | 'status'; title: string }> = {
    error: { container: 'border-danger bg-danger-surface', text: 'text-danger', role: 'alert', title: 'Compliance errors' },
    warning: { container: 'border-warning bg-warning-surface', text: 'text-warning', role: 'status', title: 'Compliance warnings' },
};

export default function ComplianceErrorsPanel({ messages, severity = 'error', title, description }: Props) {
    const uniqueMessages = [...new Set(messages)];

    if (uniqueMessages.length === 0) return null;

    const style = severityStyles[severity];

    return (
        <div
            className={`rounded-lg border ${style.container} p-4`}
            data-testid="compliance-errors-panel"
            data-severity={severity}
            role={style.role}
        >
            <h6 className={`mb-2 text-sm font-semibold ${style.text}`}>{title ?? style.title}</h6>
            {description ? <p className={`mb-2 text-sm ${style.text}`}>{description}</p> : null}
            <ul className={`list-disc space-y-1 ps-5 text-sm ${style.text}`}>
                {uniqueMessages.map((message) => (
                    <li key={message}>{message}</li>
                ))}
            </ul>
        </div>
    );
}
