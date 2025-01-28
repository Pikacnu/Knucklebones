import { db } from './db.ts';

export type User = {
	id: number;
	name: string;
	password: string;
	create_at: string;
};

export type Session = {
	id: string;
	user_id: number;
};

export type Room = {
	id: number;
	player1: number;
	player2: number | null;
	status: 'waiting' | 'ongoing' | 'completed' | 'abandoned';
};

export type Game = {
	id: number;
	current_player: number;
	current_point: number;
	winner: number | null;
	room_id: number;
	table_view: string;
	steps: number;
};

export type Move = {
	id: number;
	game_id: number;
	player_id: number;
	column: number;
	number: number;
	last_move_at: string;
};

export type Token = {
	id: string;
	user_id: number;
	created_at: string;
};

export async function verifyUser(
	name: string,
	password: string,
): Promise<boolean> {
	const user = db.query('SELECT * FROM users WHERE name = ?').get(name) as User;
	if (!user) return false;
	return await Bun.password.verify(password, user.password);
}

export async function createUser(
	name: string,
	password: string,
): Promise<void> {
	const user = db.query('SELECT * FROM users WHERE name = ?').get(name) as User;
	if (user) {
		throw new Error('User already exists');
	}
	const hash = await Bun.password.hash(password);
	db.query('INSERT INTO users (name, password) VALUES (?, ?)').run(name, hash);
}

export async function createSession(name: string): Promise<string> {
	const user = db.query('SELECT * FROM users WHERE name = ?').get(name) as User;
	if (!user) {
		throw new Error('User not found');
	}
	const sessionKey = Bun.randomUUIDv7();
	db.query('INSERT INTO sessions (id, user_id) VALUES (?, ?)').run(
		sessionKey,
		user.id,
	);
	return sessionKey;
}

export async function verifySession(
	sessionKey: string | undefined,
): Promise<null | Session> {
	if (sessionKey === undefined || sessionKey.trim().length === 0 || !sessionKey)
		return null;
	const session = db
		.query('SELECT * FROM sessions WHERE id = ?')
		.get(sessionKey);
	if (!session) return null;
	return session as Session;
}
