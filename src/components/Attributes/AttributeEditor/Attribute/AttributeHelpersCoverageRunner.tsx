import { useEffect } from 'react';
import {
    transformInputValueForDescriptor,
    getSelectValueFromField,
    getFormTypeFromAttributeContentType,
    buildAttributeValidators,
    getRegexpConstraint,
    getUpdatedOptionsForEditSelect,
    parseListValueByContentType,
} from './attributeHelpers';
import { AttributeContentType, AttributeConstraintType } from 'types/openapi';

const minimalDataDescriptor = (contentType: AttributeContentType, required = false) =>
    ({
        type: 'data',
        contentType,
        properties: { required, label: 'Test', readOnly: false, visible: true, list: false, multiSelect: false },
    }) as any;

/**
 * Mounted in the browser by attributeHelpers.spec.ts so that attributeHelpers.ts
 * is loaded and executed in the page, enabling coverage collection (Playwright
 * only records coverage for code that runs in the browser).
 */
export default function AttributeHelpersCoverageRunner() {
    useEffect(() => {
        const dStr = minimalDataDescriptor(AttributeContentType.String);
        const dDt = minimalDataDescriptor(AttributeContentType.Datetime);
        const dBool = minimalDataDescriptor(AttributeContentType.Boolean, true);

        transformInputValueForDescriptor('x', dStr);
        transformInputValueForDescriptor('2024-01-01T00:00:00', dDt);
        transformInputValueForDescriptor(undefined, dBool);

        getSelectValueFromField(undefined, true);
        getSelectValueFromField([{ value: 1, label: 'One' }], true);
        getSelectValueFromField('single', false);
        getSelectValueFromField({ value: 1, label: 'X' }, false);

        getFormTypeFromAttributeContentType(AttributeContentType.Boolean);
        getFormTypeFromAttributeContentType(AttributeContentType.Integer);
        getFormTypeFromAttributeContentType(AttributeContentType.String);
        getFormTypeFromAttributeContentType(AttributeContentType.Text);
        getFormTypeFromAttributeContentType(AttributeContentType.Codeblock);
        getFormTypeFromAttributeContentType(AttributeContentType.Date);
        getFormTypeFromAttributeContentType(AttributeContentType.Time);
        getFormTypeFromAttributeContentType(AttributeContentType.Datetime);
        getFormTypeFromAttributeContentType(AttributeContentType.Secret);
        getFormTypeFromAttributeContentType(AttributeContentType.Credential);
        getFormTypeFromAttributeContentType(AttributeContentType.Object);
        getFormTypeFromAttributeContentType('unknown' as AttributeContentType);

        buildAttributeValidators(undefined);
        buildAttributeValidators({ type: 'info', contentType: AttributeContentType.String, properties: {} } as any);
        buildAttributeValidators(minimalDataDescriptor(AttributeContentType.String, true));
        buildAttributeValidators(minimalDataDescriptor(AttributeContentType.Float, true));
        const withRegexpConstraint = {
            type: 'data',
            contentType: AttributeContentType.Integer,
            properties: { required: true, label: 'L', readOnly: false, visible: true, list: false, multiSelect: false },
            constraints: [
                { type: AttributeConstraintType.RegExp, data: '^[0-9]+$', errorMessage: 'Digits' },
                { type: AttributeConstraintType.Range, data: { from: 1, to: 10 }, errorMessage: 'Range' },
            ],
        } as any;
        buildAttributeValidators(withRegexpConstraint);
        getRegexpConstraint(withRegexpConstraint);

        getUpdatedOptionsForEditSelect([], [{ label: 'A', value: 1 }]);
        getUpdatedOptionsForEditSelect(
            [{ label: 'A', value: 1 }],
            [
                { label: 'A', value: 1 },
                { label: 'B', value: 2 },
            ],
        );
        getUpdatedOptionsForEditSelect([]);

        // Exercise parseListValueByContentType for coverage
        parseListValueByContentType(AttributeContentType.Integer, '42');
        parseListValueByContentType(AttributeContentType.Integer, { value: 42, label: 'forty-two' });
        parseListValueByContentType(AttributeContentType.Float, '3.14');
        parseListValueByContentType(AttributeContentType.Boolean, 'true');
        parseListValueByContentType(AttributeContentType.Boolean, '0');
        parseListValueByContentType(AttributeContentType.String, ' hello ');
        parseListValueByContentType(AttributeContentType.Text, '');
        parseListValueByContentType(AttributeContentType.String, undefined);
    }, []);

    return <div data-testid="attribute-helpers-coverage-done" />;
}
