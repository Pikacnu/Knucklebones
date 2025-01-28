import { describe, it, expect, beforeEach } from 'bun:test';
import {
	createUser,
	createSession,
	verifySession,
	verifyUser,
	type User,
} from './user';
import { db } from './db';

describe('Session Management', () => {
	beforeEach(() => {
		db.exec('DELETE FROM users');
		db.exec('DELETE FROM sessions');
	});

	describe('verifySession', () => {
		it('should return null for an undefined session key', async () => {
			const result = await verifySession(undefined);
			expect(result).toBeNull();
		});

		it('should return null for an empty session key', async () => {
			const result = await verifySession('');
			expect(result).toBeNull();
		});

		it('should return null for a non-existent session key', async () => {
			const result = await verifySession('non-existent-session-key');
			expect(result).toBeNull();
		});

		it('should return a session for a valid session key', async () => {
			const userName = 'testuser';
			const userPassword = 'password123';
			await createUser(userName, userPassword);
			const sessionKey = await createSession(userName);
			const result = await verifySession(sessionKey);
			expect(result).toBeDefined();
			expect(result?.id).toBe(sessionKey);
		});
	});
});

describe('User Management', () => {
	beforeEach(() => {
		db.exec('DELETE FROM users');
		db.exec('DELETE FROM sessions');
	});

	describe('createUser', () => {
		it('should create a user', async () => {
			const userName = 'testuser';
			const userPassword = 'password123';
			await createUser(userName, userPassword);
			const result = db
				.query('SELECT * FROM users WHERE name = ?')
				.get(userName) as User;
			expect(result).toBeDefined();
			expect(result.name).toBe(userName);
		});

		it('should throw an error for an existing user', async () => {
			const userName = 'testuser';
			const userPassword = 'password123';
			await createUser(userName, userPassword);
			expect(() => createUser(userName, userPassword)).toThrowError(
				'User already exists',
			);
		});
	});

	describe('verifyUser', () => {
		it('should return true for a valid user', async () => {
			const userName = 'testuser';
			const userPassword = 'password123';
			await createUser(userName, userPassword);
			const result = await verifyUser(userName, userPassword);
			expect(result).toBe(true);
		});

		it('should return false for an invalid user', async () => {
			const userName = 'testuser';
			const userPassword = 'password123';
			await createUser(userName, userPassword);
			const result = await verifyUser(userName, 'wrongpassword');
			expect(result).toBe(false);
		});
	});
});
