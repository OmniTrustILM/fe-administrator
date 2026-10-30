export const keyWithoutTokenInstanceActionNotes = {
    delete: 'Note that no token instance is associated with the Key. The key record will be removed from the platform, but will not be deleted in external key storage service.',
    destroy:
        'Note that no token instance is associated with the Key. The key will be marked as destroyed, but will not be destroyed in external key storage service.',
};

export const REMOVE_KEY_FROM_INVENTORY_NOTE =
    'The key is removed from the inventory and its history is lost. It stays in the key storage, and listing the key storage offers it for onboarding again.';

export const REMOVE_KEYS_FROM_INVENTORY_NOTE =
    'The keys are removed from the inventory and their history is lost. They stay in the key storage, and listing the key storage offers them for onboarding again.';
