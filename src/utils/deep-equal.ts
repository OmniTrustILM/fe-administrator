export function deepEqual<T>(a: T, b: T): boolean {
    // Strict equality covers primitives & identical object references
    if (a === b) return true;

    // If either is null or not an object, they are not equal
    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
        return false;
    }

    // Handle Array case separately
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((el, i) => deepEqual(el, b[i]));
    }

    // If one is array and the other is not → not equal
    if (Array.isArray(a) !== Array.isArray(b)) {
        return false;
    }

    // Compare objects
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}
