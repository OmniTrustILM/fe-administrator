import { vi } from 'vitest';

export const useDispatchMock = vi.fn();
export const useSelectorMock = vi.fn();

export const useDispatch = () => useDispatchMock();

export const useSelector = (selector: (state: unknown) => unknown) => useSelectorMock(selector);
