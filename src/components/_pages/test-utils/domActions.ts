import { act } from 'react';

export async function clickByTitle(container: HTMLElement, title: string) {
    const button = container.querySelector(`button[title="${title}"]`) as HTMLButtonElement;
    await act(() => {
        button.click();
        return Promise.resolve();
    });
}

export async function clickByText(container: HTMLElement, text: string) {
    const button = Array.from(container.querySelectorAll('button')).find((el) => el.textContent === text) as HTMLButtonElement;
    await act(() => {
        button.click();
        return Promise.resolve();
    });
}

export async function clickByTestId(container: HTMLElement, testId: string) {
    const button = container.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement;
    await act(() => {
        button.click();
        return Promise.resolve();
    });
}
