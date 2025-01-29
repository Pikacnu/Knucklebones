import { describe, it, expect, beforeEach } from 'bun:test';
import { RoomRoute } from './room';
import { db } from '../utils/db';

describe('RoomRoute', () => {
	beforeEach(() => {
		db.exec('DELETE FROM rooms');
		db.exec('DELETE FROM games');
		db.exec('DELETE FROM users');
		db.exec('DELETE FROM sessions');
	});

	it('should return 400 for a bad request on GET /api/rooms', async () => {
		const request = new Request('http://localhost/api/rooms', {
			method: 'GET',
			body: JSON.stringify({}),
		});
		const response = await RoomRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('Bad request');
	});

	it('should return 401 for an unauthorized request on POST /api/rooms', async () => {
		const request = new Request('http://localhost/api/rooms', {
			method: 'POST',
			headers: {
				Cookie: '',
			},
			body: JSON.stringify({}),
		});
		const response = await RoomRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
	});

	it('should create a room for an authorized request on POST /api/rooms', async () => {
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

		const request = new Request('http://localhost/api/rooms', {
			method: 'POST',
			headers: {
				Cookie: `session=${sessionKey}`,
			},
			body: JSON.stringify({}),
		});
		const response = await RoomRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(201);
		const body = await response.json();
		expect(body.message).toBe('Room created');
		expect(body.room_id).toBeDefined();
	});

	it('should return 404 for a non-existent room on GET /api/rooms', async () => {
		const request = new Request('http://localhost/api/rooms', {
			method: 'GET',
			body: JSON.stringify({ room_id: 999 }),
		});
		const response = await RoomRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(404);
		const body = await response.json();
		expect(body.error).toBe('Not found');
	});

	it('should return 200 for a valid room on GET /api/rooms', async () => {
		const user_id = 1;
		db.query('INSERT INTO users (id, name, password) VALUES (?, ?, ?)').run(
			user_id,
			'testuser',
			'password123',
		);
		db.query('INSERT INTO rooms (id, player1) VALUES (?, ?)').run(1, user_id);

		const request = new Request('http://localhost/api/rooms', {
			method: 'GET',
			body: JSON.stringify({ room_id: 1 }),
		});
		const response = await RoomRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.id).toBe(1);
		expect(body.player1).toBe(user_id);
	});

	it('should return 401 for an unauthorized request on DELETE /api/rooms', async () => {
		const request = new Request('http://localhost/api/rooms', {
			method: 'DELETE',
			headers: {
				Cookie: '',
			},
			body: JSON.stringify({ room_id: 1 }),
		});
		const response = await RoomRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
	});

	it('should delete a room for an authorized request on DELETE /api/rooms', async () => {
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
		db.query('INSERT INTO rooms (id, player1) VALUES (?, ?)').run(1, user_id);

		const request = new Request('http://localhost/api/rooms', {
			method: 'DELETE',
			headers: {
				Cookie: `session=${sessionKey}`,
			},
			body: JSON.stringify({ room_id: 1 }),
		});
		const response = await RoomRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.message).toBe('Deleted');
	});

	it('should return 404 for a non-existent room on DELETE /api/rooms', async () => {
		const user_id = 1;
		const sessionKey = 'valid-session';
		db.query('INSERT INTO users (id, name, password) VALUES (?, ?, ?)').run(
			user_id,
			'testuser',
			'password',
		);
		db.query('INSERT INTO sessions (id, user_id) VALUES (?, ?)').run(
			sessionKey,
			user_id,
		);
		const request = new Request('http://localhost/api/rooms', {
			method: 'DELETE',
			headers: {
				Cookie: `session=${sessionKey}`,
			},
			body: JSON.stringify({ room_id: 999 }),
		});
		const response = await RoomRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(404);
		const body = await response.json();
		expect(body.error).toBe('Not found');
	});

	it('should return 400 for a bad request on DELETE /api/rooms', async () => {
		const user_id = 1;
		const sessionKey = 'valid-session';
		db.query('INSERT INTO users (id, name, password) VALUES (?, ?, ?)').run(
			user_id,
			'testuser',
			'password',
		);
		db.query('INSERT INTO sessions (id, user_id) VALUES (?, ?)').run(
			sessionKey,
			user_id,
		);
		const request = new Request('http://localhost/api/rooms', {
			method: 'DELETE',
			headers: {
				Cookie: `session=${sessionKey}`,
			},
			body: JSON.stringify({}),
		});
		const response = await RoomRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('Bad request');
	});
	it('should delete a room successfully', async () => {
		const user_id = 1;
		const session = 'valid-session';
		db.query('INSERT INTO users (id, name, password) VALUES (?, ?, ?)').run(
			user_id,
			'testuser',
			'password',
		);
		db.query('INSERT INTO sessions (id, user_id) VALUES (?, ?)').run(
			session,
			user_id,
		);
		db.query('INSERT INTO rooms (id, player1) VALUES (?, ?)').run(1, user_id);

		const request = new Request('http://localhost/api/rooms', {
			method: 'DELETE',
			headers: {
				Cookie: `session=${session}`,
			},
			body: JSON.stringify({ room_id: 1 }),
		});
		const response = await RoomRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(200);
	});
});
