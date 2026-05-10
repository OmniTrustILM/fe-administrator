import cn from 'classnames';

type Props = {
    checked: boolean;
    onSelect: () => void;
    children: React.ReactNode;
    maxWidth?: number;
};

export default function RadioRow({ checked, onSelect, children, maxWidth }: Readonly<Props>) {
    return (
        <div style={{ maxWidth: maxWidth ?? '100%' }} className="mx-auto w-full">
            <label
                className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors',
                    checked ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200 hover:border-gray-300',
                )}
            >
                <input
                    type="radio"
                    checked={checked}
                    onChange={onSelect}
                    className="shrink-0 mt-0.5 border-gray-200 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2 flex-wrap text-sm">{children}</div>
            </label>
        </div>
    );
}
