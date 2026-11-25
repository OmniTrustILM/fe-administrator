/** Field error for a failed formatting-connector search. It tells the user why the picker is empty. */
export function formattingConnectorListError(connectorLabel: string, failure: { reason?: string } | undefined): string | undefined {
    if (!failure) return undefined;
    return `The ${connectorLabel}s could not be listed. ${failure.reason ?? ''}`.trim();
}
