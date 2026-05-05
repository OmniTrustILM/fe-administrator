import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { AttributeContentType, PlatformEnum } from 'types/openapi';
import { buildValidationRules } from 'utils/validators-helper';
import { validateRequired } from 'utils/validators';
import ContentDescriptorField from './ContentDescriptorField';
import Label from 'components/Label';
import Select from 'components/Select';
import Widget from 'components/Widget';

export { ContentFieldConfiguration } from './contentFieldConfiguration';

const AllowedAttributeContentType = [
    AttributeContentType.String,
    AttributeContentType.Integer,
    AttributeContentType.Boolean,
    AttributeContentType.Date,
    AttributeContentType.Float,
    AttributeContentType.Text,
    AttributeContentType.Time,
    AttributeContentType.Datetime,
];

type Props = Readonly<{
    editable: boolean;
    isList: boolean;
}>;

export default function DynamicContent({ editable, isList }: Props) {
    const { control, setValue } = useFormContext();
    const contentTypeValue = useWatch({ control, name: 'contentType' });
    const attributeContentTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.AttributeContentType));

    return (
        <Widget noBorder className="!bg-gray-50 !dark:bg-neutral-800 !p-4 !rounded-none !border-none">
            <div className="mb-4">
                <Label htmlFor="contentType" required>
                    Content Type
                </Label>
                <Controller
                    name="contentType"
                    control={control}
                    rules={buildValidationRules([validateRequired()])}
                    render={({ field, fieldState }) => (
                        <>
                            <Select
                                id="contentType"
                                placeholder="Content Type"
                                disabled={!editable}
                                value={field.value}
                                options={AllowedAttributeContentType.map((contentType) => ({
                                    label: getEnumLabel(attributeContentTypeEnum, contentType),
                                    value: contentType,
                                }))}
                                onChange={(value) => {
                                    field.onChange(value);
                                    setValue('content', []);
                                }}
                            />
                            {fieldState.error && fieldState.isTouched && (
                                <p className="mt-1 text-sm text-red-600">
                                    {typeof fieldState.error === 'string' ? fieldState.error : fieldState.error?.message || 'Invalid value'}
                                </p>
                            )}
                        </>
                    )}
                />
            </div>

            <ContentDescriptorField isList={isList} contentType={contentTypeValue} />
        </Widget>
    );
}
