import { TokenAliveTime } from '../../config';
import { db } from './db';
import type { Token } from './user';

export function createToken(user_id: number): string {
	const token = Bun.randomUUIDv7();
	db.query('INSERT INTO tokens (id, user_id) VALUES (?, ?)').run(
		token,
		user_id,
	);
	return token;
}

export enum TokenVerifyResult {
	Valid,
	Invalid,
	Expired,
}

export const verifyToken = (token: string): TokenVerifyResult => {
	const user = db
		.query('SELECT * FROM tokens WHERE id = ?')
		.get(token) as Token;
	if (!user) return TokenVerifyResult.Invalid;
	if (new Date(user.created_at).getTime() < Date.now() - TokenAliveTime) {
		return TokenVerifyResult.Expired;
	}
	return TokenVerifyResult.Valid;
};
