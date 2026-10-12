import { KeyState, KeyType } from 'types/openapi';

export const REMOVE_KEY_FROM_INVENTORY_NOTE =
    'The key is removed from the inventory and its history is lost. It stays in the key storage, and listing the key storage offers it for onboarding again.';

export const REMOVE_KEYS_FROM_INVENTORY_NOTE =
    'The keys are removed from the inventory and their history is lost. They stay in the key storage, and listing the key storage offers them for onboarding again.';

type KeyItemFacts = Readonly<{ type: KeyType; state: KeyState }>;

const DESTROYED_STATES: readonly KeyState[] = [KeyState.Destroyed, KeyState.DestroyedCompromised];
const COMPROMISED_STATES: readonly KeyState[] = [KeyState.Compromised, KeyState.DestroyedCompromised];

function isPrivateKeyInToken(item: KeyItemFacts): boolean {
    return item.type === KeyType.Private && !DESTROYED_STATES.includes(item.state);
}

/**
 * Core's rule, so a page offers removal only where Core allows it: a later listing of the key's token must find the key
 * again, and a compromised key must not come back active through onboarding.
 */
export function isRemovableFromInventory(tokenListsKeys: boolean, items: readonly KeyItemFacts[]): boolean {
    return tokenListsKeys && items.some(isPrivateKeyInToken) && !items.some((item) => COMPROMISED_STATES.includes(item.state));
}
