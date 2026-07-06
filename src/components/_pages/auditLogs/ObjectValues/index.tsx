type Props = {
    className?: string;
    obj: unknown;
};

function ObjectValues({ className, obj }: Readonly<Props>) {
    if (!obj) return null;

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return <>{obj}</>;

    if (typeof obj !== 'object') return <>{String(obj)}</>;

    return (
        <ul className={className}>
            {Object.entries(obj).map(([key, value]) => (
                <li key={key}>
                    {key}: <ObjectValues obj={value}></ObjectValues>
                </li>
            ))}
        </ul>
    );
}

export default ObjectValues;
