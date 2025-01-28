import { describe, it, expect, beforeEach } from 'bun:test';
import { TokenRoute } from './token';
import { db } from '../utils/db';

describe('TokenRoute', () => {
	beforeEach(() => {
		db.exec('DELETE FROM tokens');
		db.exec('DELETE FROM sessions');
		db.exec('DELETE FROM users');
	});

	it('should return 401 for an unauthorized request', async () => {
		const request = new Request('http://localhost/api/token', {
			method: 'POST',
			headers: {
				Cookie: '',
			},
		});
		const response = await TokenRoute(request, {} as any);
		if (response === null) throw new Error('Response is null');
		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body.message).toBe('Unauthorized');
	});

	it('should create a token for an authorized request', async () => {
		const user_id = 1;
		const sessionKey = 'valid-session-key';
		db.query('INSERT INTO users (id, name, password) VALUES (?, ?, ?)').run(
			user_id,
			'testuser',
			'password123',
		);
		db.query('INSERT INTO sessions (id, user_id) VALUES (?, ?)').run(
			sessionKey,
			user_id,
		);

		const request = new Request('http://localhost/api/token', {
			method: 'POST',
			headers: {
				Cookie: `session=${sessionKey}`,
			},
		});
		const response = await TokenRoute(request, {} as any);
		if (response === null) throw new Error('Response is null');
		expect(response.status).toBe(201);
		const body = await response.json();
		expect(body.message).toBe('Token created');
		expect(body.token).toBeDefined();
	});

	it('should return null for non-POST requests', async () => {
		const user_id = 1;
		const sessionKey = 'valid-session-key';
		db.query('INSERT INTO users (id, name, password) VALUES (?, ?, ?)').run(
			user_id,
			'testuser',
			'password123',
		);
		db.query('INSERT INTO sessions (id, user_id) VALUES (?, ?)').run(
			sessionKey,
			user_id,
		);

		const request = new Request('http://localhost/api/token', {
			method: 'GET',
			headers: {
				Cookie: `session=${sessionKey}`,
			},
		});
		const response = await TokenRoute(request, {} as any);
		expect(response).toBeNull();
	});
});
