import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock console methods for testing
const originalConsole = { ...console };

// Recreate the activity function for testing
async function activity(label, func) {
	let log = [];
	let err = '';

	try {
		console.time(label);
		await func(log);
	} catch (e) {
		err = e;
	} finally {
		console.timeEnd(label);
		log.forEach(([key, val]) => {
			console.log(' ', key.padEnd(10), ':', val);
		});

		if (err) {
			['', err, '', 'State dump:', {}].forEach((m) => console.error(m));
			throw new Error('Activity failed');
		}
	}
}

describe('activity', () => {
	let consoleTimeSpy, consoleTimeEndSpy, consoleLogSpy, consoleErrorSpy;

	beforeEach(() => {
		consoleTimeSpy = vi.spyOn(console, 'time').mockImplementation(() => {});
		consoleTimeEndSpy = vi.spyOn(console, 'timeEnd').mockImplementation(() => {});
		consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should execute function and log timing', async () => {
		const mockFunc = vi.fn((log) => {
			log.push(['status', 'completed']);
		});

		await activity('test-activity', mockFunc);

		expect(consoleTimeSpy).toHaveBeenCalledWith('test-activity');
		expect(consoleTimeEndSpy).toHaveBeenCalledWith('test-activity');
		expect(mockFunc).toHaveBeenCalledTimes(1);
	});

	it('should log activity results', async () => {
		const mockFunc = (log) => {
			log.push(['status', 'success']);
			log.push(['files', '5']);
		};

		await activity('test-activity', mockFunc);

		expect(consoleLogSpy).toHaveBeenCalledWith(' ', 'status    ', ':', 'success');
		expect(consoleLogSpy).toHaveBeenCalledWith(' ', 'files     ', ':', '5');
	});

	it('should handle errors and throw', async () => {
		const testError = new Error('Test error');
		const mockFunc = () => {
			throw testError;
		};

		await expect(activity('failing-activity', mockFunc)).rejects.toThrow('Activity failed');
		
		expect(consoleErrorSpy).toHaveBeenCalledWith('');
		expect(consoleErrorSpy).toHaveBeenCalledWith(testError);
		expect(consoleErrorSpy).toHaveBeenCalledWith('');
		expect(consoleErrorSpy).toHaveBeenCalledWith('State dump:');
	});

	it('should handle async functions', async () => {
		const mockFunc = async (log) => {
			await new Promise(resolve => setTimeout(resolve, 10));
			log.push(['async', 'completed']);
		};

		await activity('async-activity', mockFunc);

		expect(consoleLogSpy).toHaveBeenCalledWith(' ', 'async     ', ':', 'completed');
	});

	it('should handle functions that add multiple log entries', async () => {
		const mockFunc = (log) => {
			log.push(['step1', 'done']);
			log.push(['step2', 'done']);
			log.push(['step3', 'done']);
		};

		await activity('multi-step', mockFunc);

		expect(consoleLogSpy).toHaveBeenCalledTimes(3);
		expect(consoleLogSpy).toHaveBeenNthCalledWith(1, ' ', 'step1     ', ':', 'done');
		expect(consoleLogSpy).toHaveBeenNthCalledWith(2, ' ', 'step2     ', ':', 'done');
		expect(consoleLogSpy).toHaveBeenNthCalledWith(3, ' ', 'step3     ', ':', 'done');
	});
});