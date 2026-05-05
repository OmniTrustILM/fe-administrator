import Widget from 'components/Widget';

type Props = Readonly<{
    //TODO: Add a null type to data which should also be sent from the backend then we can use widget lock for this component
    data?: number;
    title: string;
    link: string;
    extraComponent?: React.ReactNode;
}>;

function CountBadge({ data, title, link, extraComponent }: Props) {
    return (
        <Widget
            titleLink={link}
            title={title}
            className="h-full"
            titleColor="var(--primary-blue-color)"
            titleBoldness="semi-bold"
            titleSize="large"
        >
            <div className="text-3xl !text-[var(--dark-gray-color)]">{data}</div>
            {extraComponent && <div className="mt-4">{extraComponent}</div>}
        </Widget>
    );
}

export default CountBadge;
