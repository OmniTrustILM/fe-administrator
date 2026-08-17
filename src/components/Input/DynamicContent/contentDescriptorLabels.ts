/**
 * `content` carries two meanings: for a list attribute it is the set of selectable options, for a
 * scalar one it is the value the field is pre-filled with. Kept here so the form and the detail
 * page cannot drift apart.
 */
export const getContentDescriptorLabels = (isList: boolean) => ({
    label: isList ? 'Options' : 'Default Content',
    placeholder: isList ? 'Option' : 'Default Content',
    addButton: isList ? 'Add Option' : 'Add Content',
});
