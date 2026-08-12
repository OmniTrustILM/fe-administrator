import Toggletip from 'components/Toggletip';
import { getEnumDescription, getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { useSelector } from 'react-redux';
import type { PlatformEnum } from 'types/openapi';

type ValueProps = {
    platformEnum: PlatformEnum;
    value: string | undefined;
    iconSize?: number;
    dataTestId?: string;
};

export function EnumValueDescription({ platformEnum, value, iconSize, dataTestId }: Readonly<ValueProps>) {
    const enumMap = useSelector(enumSelectors.platformEnum(platformEnum));
    const description = getEnumDescription(enumMap, value);

    if (!description || !value) return null;

    const label = getEnumLabel(enumMap, value);

    return (
        <Toggletip
            ariaLabel={`${label} description`}
            iconSize={iconSize}
            dataTestId={dataTestId ?? `enum-info-${value}`}
            content={
                <>
                    <div className="font-semibold mb-1">{label}</div>
                    <div className="text-content">{description}</div>
                </>
            }
        />
    );
}

type ColumnProps = {
    platformEnum: PlatformEnum;
    title: string;
    iconSize?: number;
    dataTestId?: string;
    /**
     * Maps an enum value (code) to the color used for its indicator dot in the column.
     * When provided, the legend lists every value with its color swatch so the dot
     * colors shown in the rows can be matched to their meaning.
     */
    colorResolver?: (code: string) => string | undefined;
};

export function EnumColumnDescription({ platformEnum, title, iconSize, dataTestId, colorResolver }: Readonly<ColumnProps>) {
    const enumMap = useSelector(enumSelectors.platformEnum(platformEnum));

    const allItems = Object.values(enumMap ?? {});
    // With a color key, list every value so the dot colors map 1:1; otherwise only described values.
    const items = colorResolver ? allItems : allItems.filter((item) => Boolean(item?.description));

    if (items.length === 0) return null;

    return (
        <Toggletip
            ariaLabel={`${title} value descriptions`}
            iconSize={iconSize}
            triggerClassName="!text-current hover:!text-current"
            dataTestId={dataTestId ?? `enum-column-info-${platformEnum}`}
            content={
                <>
                    <div className="font-semibold mb-2">{title}</div>
                    <dl className="space-y-1.5">
                        {items.map((item) => {
                            const color = colorResolver?.(item.code);
                            return (
                                <div key={item.code} className="flex items-baseline gap-1.5">
                                    {color && (
                                        <span
                                            aria-hidden="true"
                                            className="mt-[3px] inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{ backgroundColor: color }}
                                        />
                                    )}
                                    <div className="min-w-0">
                                        <dt className="font-medium inline">{item.label}</dt>
                                        {item.description && (
                                            <dd className="inline text-content">
                                                {' — '}
                                                {item.description}
                                            </dd>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </dl>
                </>
            }
        />
    );
}
