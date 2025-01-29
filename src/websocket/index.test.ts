import { wsMove, wsRoom, wsToken } from './index';
import { describe, it, expect, beforeEach, mock } from 'bun:test';

describe('WebSocket Handlers', () => {
	let ws: any;
	beforeEach(() => {
		ws = {
			send: mock((string: string) => {}),
		};
	});

	describe('wsToken', () => {
		it('should handle token messages', async () => {
			const data = { type: 'token', action: 'someAction', data: {} };
			await wsToken(ws, data);
			expect(ws.send).toHaveBeenCalledWith(expect.any(String));
		});
	});

	describe('wsRoom', () => {
		it('should handle room messages', async () => {
			const data = { type: 'room', action: 'someAction', data: {} };
			await wsRoom(ws, data);
			expect(ws.send).toHaveBeenCalledWith(expect.any(String));
		});
	});

	describe('wsMove', () => {
		it('should handle move messages', async () => {
			const data = { type: 'move', action: 'someAction', data: {} };
			await wsMove(ws, data);
			expect(ws.send).toHaveBeenCalledWith(expect.any(String));
		});
	});
});
