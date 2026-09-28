import TextInput from 'components/TextInput';
import { Controller, useFormContext } from 'react-hook-form';

export type FilePasswordValues = { passphrase: string };

type Props = Readonly<{
    onLeave?: () => void;
    /** Why the field must be filled before the file can be imported. */
    notice?: string;
}>;

export default function FilePassword({ onLeave, notice }: Props) {
    const { control } = useFormContext<FilePasswordValues>();
    return (
        <Controller
            name="passphrase"
            control={control}
            render={({ field }) => (
                <div>
                    <TextInput
                        id="importPassphrase"
                        type="password"
                        label="File password"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={() => {
                            field.onBlur();
                            onLeave?.();
                        }}
                        // Enter reads the file again with the password, as leaving the field does, rather than submitting the form.
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter') return;
                            event.preventDefault();
                            onLeave?.();
                        }}
                        invalid={!!notice}
                        error={notice}
                        ariaDescribedBy="importPassphrase-hint"
                    />
                    <p id="importPassphrase-hint" className="mt-2 text-sm text-content-muted">
                        Required for protected files. Used only to read the file, never stored.
                    </p>
                </div>
            )}
        />
    );
}
