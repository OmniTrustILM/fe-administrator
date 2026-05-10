import type { MutableState, Tools } from 'final-form';

export function mutators<T>() {
    return {
        setAttribute: (args: any[], state: MutableState<T>, tools: Tools<T>) => {
            const key = args[0];
            const value = args[1];

            tools.changeValue(state, key, (prev: any) => value);
        },

        clearAttributes: (args: any[], state: MutableState<T>, tools: Tools<T>) => {
            const id = args[0];
            const attributes = Object.keys(state.formState.values ?? {}).filter((k) => k.startsWith(`__attributes__${id ?? ''}`));
            attributes.forEach((attribute) => ((state.formState.values as any)[attribute] = undefined));
        },
    };
}
