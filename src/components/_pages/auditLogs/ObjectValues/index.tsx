type Props = {
    className?: string;
    obj: any;
};

function ObjectValues({ className, obj }: Readonly<Props>) {
    if (!obj) return null;

    if (typeof obj !== 'object') return obj;

    return (
        <ul className={className}>
            {Object.entries(obj).map(([key, value], index) => (
                <li key={`value-${index}`}>
                    {key}: <ObjectValues obj={value}></ObjectValues>
                </li>
            ))}
        </ul>
    );
}

export default ObjectValues;
