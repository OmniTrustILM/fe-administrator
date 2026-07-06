import { AttributeContentType } from 'types/openapi';
import { validateFloat, validateInteger, validateRequired } from 'utils/validators';

export const ContentFieldConfiguration: {
    [key: string]: { validators?: ((value: unknown) => undefined | string)[]; type: string; initial: string | boolean | number };
} = {
    [AttributeContentType.Text]: {
        validators: [],
        type: 'textarea',
        initial: '',
    },
    [AttributeContentType.String]: {
        validators: [],
        type: 'text',
        initial: '',
    },
    [AttributeContentType.Integer]: {
        validators: [validateInteger()],
        type: 'number',
        initial: '0',
    },
    [AttributeContentType.Float]: {
        validators: [validateFloat()],
        type: 'number',
        initial: '0',
    },
    [AttributeContentType.Boolean]: {
        type: 'checkbox',
        initial: false,
    },
    [AttributeContentType.Datetime]: {
        validators: [validateRequired()],
        type: 'datetime-local',
        initial: '',
    },
    [AttributeContentType.Date]: {
        validators: [validateRequired()],
        type: 'date',
        initial: '',
    },
    [AttributeContentType.Time]: {
        validators: [validateRequired()],
        type: 'time',
        initial: '',
    },
};
