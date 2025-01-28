import { describe, it, expect, beforeEach } from 'bun:test';
import { createToken, verifyToken, TokenVerifyResult } from './token';
import { db } from './db';
import type { Token } from './user';
import { TokenAliveTime } from '../../config';

describe('Token Management', () => {
	beforeEach(() => {
		db.exec('DELETE FROM tokens');
	});

	describe('createToken', () => {
		it('should create a token for a user', () => {
			const user_id = 1;
			const token = createToken(user_id);
			expect(token).toBeDefined();
			const result = db
				.query('SELECT * FROM tokens WHERE id = ?')
				.get(token) as Token;
			expect(result).toBeDefined();
			expect(result.user_id).toBe(user_id);
		});
	});

	describe('verifyToken', () => {
		it('should return Valid for a valid token', () => {
			const user_id = 1;
			const token = createToken(user_id);
			const result = verifyToken(token) as TokenVerifyResult;
			expect(result).toBe(TokenVerifyResult.Valid);
		});

		it('should return Invalid for a non-existent token', () => {
			const result = verifyToken('non-existent-token') as TokenVerifyResult;
			expect(result).toBe(TokenVerifyResult.Invalid);
		});

		it('should return Expired for an expired token', () => {
			const user_id = 1;
			const token = createToken(user_id);
			const expiredDate = new Date(
				Date.now() - TokenAliveTime - 1000,
			).toISOString();
			db.query('UPDATE tokens SET created_at = ? WHERE id = ?').run(
				expiredDate,
				token,
			);
			const result = verifyToken(token) as TokenVerifyResult;
			expect(result).toBe(TokenVerifyResult.Expired);
		});
	});
	describe('TokenVerifyResult', () => {
		it('should return Valid for a valid token', () => {
			const user_id = 1;
			const token = createToken(user_id);
			const result = verifyToken(token);
			expect(result).toBe(TokenVerifyResult.Valid);
		});

		it('should return Invalid for a non-existent token', () => {
			const result = verifyToken('non-existent-token');
			expect(result).toBe(TokenVerifyResult.Invalid);
		});

		it('should return Expired for an expired token', () => {
			const user_id = 1;
			const token = createToken(user_id);
			const expiredDate = new Date(
				Date.now() - TokenAliveTime - 1000,
			).toISOString();
			db.query('UPDATE tokens SET created_at = ? WHERE id = ?').run(
				expiredDate,
				token,
			);
			const result = verifyToken(token);
			expect(result).toBe(TokenVerifyResult.Expired);
		});
	});
});
