type Props = Readonly<{
    status: boolean;
    dataTestId?: string;
}>;

function KeyStatusCircle({ status, dataTestId = 'key-status-circle' }: Props) {
    const { color, text } = status
        ? { color: 'var(--status-success-color)', text: 'Enabled' }
        : { color: 'var(--status-danger-color)', text: 'Disabled' };

    return <span title={text} className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} data-testid={dataTestId} />;
}

export default KeyStatusCircle;
