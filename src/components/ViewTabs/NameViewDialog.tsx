import Dialog from 'components/Dialog';
import TextInput from 'components/TextInput';
import { useEffect, useState } from 'react';

type Props = Readonly<{
    isOpen: boolean;
    caption: string;
    confirmLabel: string;
    /** The name the field opens with: the current one when renaming, a suggestion when creating. */
    initialName: string;
    /** Names already taken for this resource, which the API rejects a duplicate of. */
    takenNames: readonly string[];
    isBusy: boolean;
    onClose: () => void;
    onSubmit: (name: string) => void;
    dataTestId: string;
}>;

/** Names a view, whether it is being created, duplicated into or renamed. */
export default function NameViewDialog({
    isOpen,
    caption,
    confirmLabel,
    initialName,
    takenNames,
    isBusy,
    onClose,
    onSubmit,
    dataTestId,
}: Props) {
    const [name, setName] = useState(initialName);

    // Seeded on each open rather than on every render, so typing is not overwritten by a re-render
    // that carries the same suggestion.
    useEffect(() => {
        if (isOpen) setName(initialName);
    }, [isOpen, initialName]);

    const trimmed = name.trim();
    const isTaken = trimmed !== initialName.trim() && takenNames.includes(trimmed);

    let error: string | undefined;
    if (trimmed === '') error = 'A view needs a name.';
    else if (isTaken) error = 'A view of this name already exists.';

    return (
        <Dialog
            isOpen={isOpen}
            toggle={onClose}
            caption={caption}
            size="sm"
            dataTestId={dataTestId}
            body={
                <TextInput
                    id={`${dataTestId}-name`}
                    label="Name"
                    required
                    value={name}
                    onChange={setName}
                    error={name === initialName ? undefined : error}
                    dataTestId={`${dataTestId}-input`}
                />
            }
            buttons={[
                { color: 'secondary', variant: 'outline', onClick: onClose, body: 'Cancel' },
                {
                    color: 'primary',
                    onClick: () => onSubmit(trimmed),
                    body: confirmLabel,
                    disabled: isBusy || error !== undefined,
                },
            ]}
        />
    );
}
