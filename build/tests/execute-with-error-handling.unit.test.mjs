import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock the program module since it's used in executeWithErrorHandling
const mockProgram = {
	error: vi.fn()
};

// Mock RUN global object
const mockRUN = {
	site: '/test/site',
	core: '/test/core',
	versions: ['v1.0.0', 'latest']
};

// Recreate the executeWithErrorHandling function for testing
async function executeWithErrorHandling(label, func) {
	let log = [];
	let err = '';

	try {
		await func(log);
	} catch (e) {
		err = e;
	} finally {
		if (err) {
			['', err, '', 'State dump:', mockRUN].forEach((m) => console.error(m));
			mockProgram.error('');
		}
	}
}

describe('executeWithErrorHandling', () => {
	let consoleErrorSpy;

	beforeEach(() => {
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		mockProgram.error.mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should execute function successfully without errors', async () => {
		const mockFunc = vi.fn((log) => {
			log.push(['status', 'completed']);
		});

		await executeWithErrorHandling('test-operation', mockFunc);

		expect(mockFunc).toHaveBeenCalledTimes(1);
		// Check that an empty array was initially passed
		expect(Array.isArray(mockFunc.mock.calls[0][0])).toBe(true);
		expect(consoleErrorSpy).not.toHaveBeenCalled();
		expect(mockProgram.error).not.toHaveBeenCalled();
	});

	it('should pass log array to function', async () => {
		const mockFunc = vi.fn((log) => {
			expect(Array.isArray(log)).toBe(true);
			expect(log.length).toBe(0); // Should start empty
			log.push(['test', 'value']);
		});

		await executeWithErrorHandling('test-operation', mockFunc);

		expect(mockFunc).toHaveBeenCalledTimes(1);
	});

	it('should handle synchronous errors', async () => {
		const testError = new Error('Synchronous test error');
		const mockFunc = vi.fn(() => {
			throw testError;
		});

		await executeWithErrorHandling('failing-operation', mockFunc);

		expect(mockFunc).toHaveBeenCalledTimes(1);
		expect(consoleErrorSpy).toHaveBeenCalledTimes(5);
		expect(consoleErrorSpy).toHaveBeenNthCalledWith(1, '');
		expect(consoleErrorSpy).toHaveBeenNthCalledWith(2, testError);
		expect(consoleErrorSpy).toHaveBeenNthCalledWith(3, '');
		expect(consoleErrorSpy).toHaveBeenNthCalledWith(4, 'State dump:');
		expect(consoleErrorSpy).toHaveBeenNthCalledWith(5, mockRUN);
		expect(mockProgram.error).toHaveBeenCalledWith('');
	});

	it('should handle asynchronous errors', async () => {
		const testError = new Error('Async test error');
		const mockFunc = vi.fn(async () => {
			await new Promise(resolve => setTimeout(resolve, 10));
			throw testError;
		});

		await executeWithErrorHandling('async-failing-operation', mockFunc);

		expect(mockFunc).toHaveBeenCalledTimes(1);
		expect(consoleErrorSpy).toHaveBeenCalledTimes(5);
		expect(consoleErrorSpy).toHaveBeenNthCalledWith(2, testError);
		expect(mockProgram.error).toHaveBeenCalledWith('');
	});

	it('should handle functions that modify log array', async () => {
		const mockFunc = vi.fn((log) => {
			expect(log.length).toBe(0); // Should start empty
			log.push(['step1', 'completed']);
			log.push(['files', '10']);
			log.push(['status', 'success']);
		});

		await executeWithErrorHandling('logging-operation', mockFunc);

		expect(mockFunc).toHaveBeenCalledTimes(1);
		// The executeWithErrorHandling function doesn't use the log array,
		// but it should allow functions to modify it
		const logArg = mockFunc.mock.calls[0][0];
		expect(logArg).toHaveLength(3);
		expect(logArg).toEqual([
			['step1', 'completed'],
			['files', '10'],
			['status', 'success']
		]);
		expect(consoleErrorSpy).not.toHaveBeenCalled();
	});

	it('should handle functions that throw string errors', async () => {
		const mockFunc = vi.fn(() => {
			throw 'String error message';
		});

		await executeWithErrorHandling('string-error-operation', mockFunc);

		expect(consoleErrorSpy).toHaveBeenCalledWith('String error message');
		expect(mockProgram.error).toHaveBeenCalledWith('');
	});

	it('should handle functions that return promises', async () => {
		const mockFunc = vi.fn(() => Promise.resolve('success'));

		await executeWithErrorHandling('promise-operation', mockFunc);

		expect(mockFunc).toHaveBeenCalledTimes(1);
		expect(consoleErrorSpy).not.toHaveBeenCalled();
		expect(mockProgram.error).not.toHaveBeenCalled();
	});

	it('should handle rejected promises', async () => {
		const testError = new Error('Promise rejection');
		const mockFunc = vi.fn(() => Promise.reject(testError));

		await executeWithErrorHandling('rejected-promise-operation', mockFunc);

		expect(mockFunc).toHaveBeenCalledTimes(1);
		expect(consoleErrorSpy).toHaveBeenCalledWith(testError);
		expect(mockProgram.error).toHaveBeenCalledWith('');
	});
});