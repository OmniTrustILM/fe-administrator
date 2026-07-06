// Minimal structural typings for the final-form mutator API surface actually used here.
// The project has migrated to react-hook-form; final-form is no longer a dependency, so
// these local types stand in for `MutableState`/`Tools` without pulling in the package.
interface MutableState<T> {
    formState: {
        values: T;
    };
}

interface Tools<T> {
    changeValue: (state: MutableState<T>, key: string, mutate: (value: unknown) => unknown) => void;
}

export function mutators<T extends Record<string, unknown>>() {
    return {
        setAttribute: (args: unknown[], state: MutableState<T>, tools: Tools<T>) => {
            const key = args[0] as string;
            const value = args[1];

            tools.changeValue(state, key, () => value);
        },

        clearAttributes: (args: unknown[], state: MutableState<T>, tools: Tools<T>) => {
            const id = args[0] as string | undefined;
            const values = state.formState.values as Record<string, unknown>;
            const attributes = Object.keys(values ?? {}).filter((k) => k.startsWith(`__attributes__${id ?? ''}`));
            attributes.forEach((attribute) => {
                values[attribute] = undefined;
            });
        },
    };
}
