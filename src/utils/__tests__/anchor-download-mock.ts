import { vi, test, expect, beforeEach } from 'vitest';

export interface AnchorDownloadMocks {
    fakeAnchor: any;
    mockClick: ReturnType<typeof vi.fn>;
    mockAppendChild: ReturnType<typeof vi.fn>;
    mockRemove: ReturnType<typeof vi.fn>;
}

export function setupAnchorDownloadMocks(): AnchorDownloadMocks {
    const mockClick = vi.fn();
    const mockRemove = vi.fn();
    const mockAppendChild = vi.fn();
    const fakeAnchor: any = { href: '', download: '', click: mockClick, remove: mockRemove, style: {} };

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') return fakeAnchor;
        return document.createElement(tag);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);

    return { fakeAnchor, mockClick, mockAppendChild, mockRemove };
}

export function runDownloadFileSuite(
    downloadFile: (content: string, fileName: string) => void,
    mockCreateObjectURL: ReturnType<typeof vi.fn>,
) {
    let mocks: AnchorDownloadMocks;

    beforeEach(() => {
        vi.clearAllMocks();
        mocks = setupAnchorDownloadMocks();
    });

    test('creates anchor element and triggers click', () => {
        downloadFile('hello', 'test.txt');
        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mocks.mockClick).toHaveBeenCalledTimes(1);
    });

    test('sets download filename on anchor', () => {
        downloadFile('hello', 'myfile.txt');
        expect(mocks.fakeAnchor.download).toBe('myfile.txt');
    });

    test('sets anchor href to object URL', () => {
        downloadFile('hello', 'test.txt');
        expect(mocks.fakeAnchor.href).toBe('blob:mock-url');
    });

    test('appends anchor to document.body', () => {
        downloadFile('hello', 'test.txt');
        expect(mocks.mockAppendChild).toHaveBeenCalledWith(mocks.fakeAnchor);
    });

    test('calls URL.createObjectURL with a Blob', () => {
        downloadFile('hello', 'test.txt');
        expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
        const arg = mockCreateObjectURL.mock.calls[0][0];
        expect(arg).toBeInstanceOf(Blob);
    });
}
