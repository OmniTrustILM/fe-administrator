import type { ReactElement } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

/** Media types the file field previews, matching the stamp-image formats of the PAdES formatter. */
const previewableImageTypes: ReadonlySet<string> = new Set(['image/png', 'image/jpeg']);

function imageDataUrlOf(content: unknown, mimeType: unknown): string | undefined {
    const isPreviewable =
        typeof content === 'string' && content !== '' && typeof mimeType === 'string' && previewableImageTypes.has(mimeType);
    return isPreviewable ? `data:${mimeType};base64,${content}` : undefined;
}

interface Props {
    /** Form name of the file attribute. The preview reads its `content` and `mimeType`. */
    name: string;
    /** Label of the file attribute. Screen readers name the preview by it. */
    label: string;
}

export default function AttributeFileImagePreview({ name, label }: Readonly<Props>): ReactElement | null {
    const { control } = useFormContext();
    const [content, mimeType] = useWatch({ control, name: [`${name}.content`, `${name}.mimeType`] }) as [unknown, unknown];
    const src = imageDataUrlOf(content, mimeType);
    if (!src) return null;
    return (
        <div className="w-full mt-4 flex justify-center">
            <img src={src} alt={label} className="max-h-40 max-w-full rounded-lg border border-divider object-contain" />
        </div>
    );
}
