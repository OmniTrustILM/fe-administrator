import ProgressButton from 'components/ProgressButton';
import Button from 'components/Button';
import Select from 'components/Select';
import { useForm, Controller } from 'react-hook-form';
import Container from 'components/Container';

interface DropDownOptions {
    label: string;
    value: string | number;
}

interface DropDownOptionsData {
    formLabel: string;
    formValue: string;
    options: DropDownOptions[];
    placement?: 'top' | 'bottom';
}

interface Props {
    dropDownOptionsList: DropDownOptionsData[];
    onSubmit: (values: Record<string, any>) => void;
    onClose: () => void;
    isBusy?: boolean;
}

const DropDownListForm = ({ onSubmit, onClose, dropDownOptionsList, isBusy = false }: Props) => {
    const defaultValues = dropDownOptionsList.reduce((acc, item) => ({ ...acc, [item.formValue]: '' }), {} as Record<string, string>);

    const {
        control,
        handleSubmit,
        formState: { isValid, isDirty },
    } = useForm<Record<string, string>>({
        mode: 'onChange',
        defaultValues,
    });

    return (
        <div className="mt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                {dropDownOptionsList.map((dropDownOptionsListItem) => (
                    <Controller
                        key={dropDownOptionsListItem.formValue}
                        name={dropDownOptionsListItem.formValue}
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => {
                            return (
                                <Select
                                    id={dropDownOptionsListItem.formValue}
                                    label={dropDownOptionsListItem.formLabel}
                                    options={dropDownOptionsListItem.options}
                                    placeholder={`Select ${dropDownOptionsListItem.formLabel}`}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placement={dropDownOptionsListItem.placement}
                                />
                            );
                        }}
                    />
                ))}
                <Container className="flex-row justify-end modal-footer" gap={4}>
                    <Button variant="outline" disabled={isBusy} onClick={onClose}>
                        Close
                    </Button>
                    <ProgressButton
                        inProgress={isBusy}
                        title={isBusy ? 'Submitting' : 'Submit'}
                        type="submit"
                        disabled={!isDirty || isBusy || !isValid}
                    />
                </Container>
            </form>
        </div>
    );
};

export default DropDownListForm;
