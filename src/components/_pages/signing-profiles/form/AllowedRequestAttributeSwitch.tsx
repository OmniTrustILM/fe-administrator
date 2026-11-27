import type { ReactElement } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import Switch from 'components/Switch';
import type { ContentSigningFormValues } from './ContentSigningWorkflowFields';
import { withPermission } from './requestAttributePermissions';

interface Props {
    /** Group code or ungrouped request-attribute name the switch allows. */
    permissionName: string;
    /** Title of the group or label of the attribute the switch allows. Screen readers name the switch by it. */
    label: string;
}

/** Switches one name in the form's `allowedRequestAttributes` on or off. A name that is on lets signing requests set the attributes behind it. */
export default function AllowedRequestAttributeSwitch({ permissionName, label }: Readonly<Props>): ReactElement {
    const { control } = useFormContext<ContentSigningFormValues>();
    const { field } = useController({ control, name: 'allowedRequestAttributes' });
    return (
        <Switch
            id={`allowedRequestAttribute-${permissionName}`}
            checked={field.value.includes(permissionName)}
            onChange={(allowed) => field.onChange(withPermission(field.value, permissionName, allowed))}
            secondaryLabel="Request may set"
            ariaLabel={`Request may set ${label}`}
        />
    );
}
