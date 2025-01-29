import type { ServerWebSocket } from 'bun';
import {
	db,
	type Game,
	type Room,
	type Session,
	type Token,
	TokenVerifyResult,
	type User,
	verifyToken,
} from '../utils';
import { TokenAliveTime } from '../../config';
import { RoomRoute } from '../apis/room';

export const wsToken = async (ws: ServerWebSocket<unknown>, data: any) => {
	if (data.action === 'validate') {
		const tokenInfo = db
			.query('SELECT * FROM tokens WHERE token = ?')
			.get(data.data.token) as Token;
		if (!tokenInfo) {
			ws.send(
				JSON.stringify({
					type: 'token',
					action: 'validate',
					data: { valid: false, message: 'Token not found' },
				}),
			);
			return;
		}
		if (
			new Date(tokenInfo.created_at).getTime() + TokenAliveTime <
			Date.now()
		) {
			ws.send(
				JSON.stringify({
					type: 'token',
					action: 'validate',
					data: { valid: false, message: 'Token expired' },
				}),
			);
			db.exec('DELETE FROM tokens WHERE token = ?', [data.data.token]);
			return;
		}
		ws.send(
			JSON.stringify({
				type: 'token',
				action: 'validate',
				data: { valid: true },
			}),
		);
	}
	if (data.action === 'update') {
		const tokenInfo = db
			.query('SELECT * FROM tokens WHERE token = ?')
			.get(data.data.token) as Token;
		if (!tokenInfo) {
			ws.send(
				JSON.stringify({
					type: 'token',
					action: 'update',
					data: { update: false, message: 'Token not found' },
				}),
			);
			return;
		}
		if (
			new Date(tokenInfo.created_at).getTime() + TokenAliveTime <
			Date.now()
		) {
			ws.send(
				JSON.stringify({
					type: 'token',
					action: 'update',
					data: { update: false, message: 'Token expired' },
				}),
			);
			db.exec('DELETE FROM tokens WHERE token = ?', [data.data.token]);
			return;
		}
		db.exec('UPDATE tokens SET created_at = ? WHERE token = ?', [
			new Date().toISOString(),
			data.data.token,
		]);
		ws.send(
			JSON.stringify({
				type: 'token',
				action: 'update',
				data: { update: true },
			}),
		);
	}
};

const createMessage = (
	data: {
		type: string;
		action: string;
		data?: { [key: string]: any };
	},
	status: boolean,
	message: string,
) => {
	return JSON.stringify({
		type: data.type,
		action: data.action,
		data: { [data.action]: status, message: message },
	});
};

export const wsRoom = async (ws: ServerWebSocket<unknown>, data: any) => {
	const tokenStatus = verifyToken(data.token);
	if (tokenStatus === TokenVerifyResult.Invalid) {
		ws.send(createMessage(data, false, 'Token not found'));
		return;
	}
	if (tokenStatus === TokenVerifyResult.Expired) {
		ws.send(createMessage(data, false, 'Token expired'));
		return;
	}
	const token = db
		.query('SELECT * FROM tokens WHERE token = ?')
		.get(data.token) as Token;
	const sessionData = db
		.query('SELECT * FROM sessions WHERE user_id = ?')
		.get(token.user_id) as Session;
	const session = sessionData.id;
	if (data.action === 'create') {
		const request = new Request('http://localhost:3000/api/rooms', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Cookie: `session=${session}`,
			},
			body: JSON.stringify({}),
		});
		const response = await RoomRoute(request, {} as any);
		if (!response) {
			ws.send(createMessage(data, false, 'Failed to create room. Try again'));
			return;
		}
		const body = await response.json();
		if (response.status !== 201) {
			ws.send(createMessage(data, false, JSON.stringify(body)));
			return;
		}
		ws.subscribe(`room-${body.room_id}`);
		ws.send(createMessage(data, true, 'Room created successfully'));
	}
	if (data.action === 'join') {
		const playerData = db
			.query('SELECT * FROM users WHERE id = ?')
			.get(token.user_id) as User;
		if (!playerData) {
			ws.send(createMessage(data, false, 'User not found'));
		}
		if (!data['room_id']) {
			ws.send(createMessage(data, false, 'Invalid room id'));
		}
		const request = new Request('http://localhost:3000/api/rooms', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Cookie: `session=${session}`,
			},
			body: JSON.stringify({ room_id: data.room_id, player_id: playerData.id }),
		});
		const response = await RoomRoute(request, {} as any);
		if (!response) {
			ws.send(createMessage(data, false, 'missing response'));
			return;
		}
		const body = await response.json();
		if (response.status !== 200) {
			ws.send(createMessage(data, false, JSON.stringify(body)));
			return;
		}
		ws.subscribe(`room-${data.room_id}`);
		ws.send(createMessage(data, true, 'Room joined successfully'));
	}
	if (data.action === 'start') {
		const request = new Request('http://localhost:3000/api/games', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Cookie: `session=${session}`,
			},
			body: JSON.stringify({ room_id: data.room_id }),
		});
		const response = await RoomRoute(request, {} as any);
		if (!response) {
			ws.send(createMessage(data, false, 'Failed to start game. Try again'));
			return;
		}
		const body = await response.json();
		if (response.status !== 200) {
			ws.send(createMessage(data, false, JSON.stringify(body)));
			return;
		}
		ws.publishText(
			`room-${data.room_id}`,
			createMessage(
				{
					type: 'game',
					action: 'start',
				},
				true,
				'Game started',
			),
		);
		ws.send(createMessage(data, true, 'Game started successfully'));
	}
	if (data.action === 'leave') {
		const playerData = db
			.query('SELECT * FROM users WHERE id = ?')
			.get(token.user_id) as User;
		if (!playerData) {
			ws.send(createMessage(data, false, 'User not found'));
		}
		if (!data['room_id']) {
			ws.send(createMessage(data, false, 'Invalid room id'));
		}
		const request = new Request('http://localhost:3000/api/rooms', {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				Cookie: `session=${session}`,
			},
			body: JSON.stringify({}),
		});
		const response = await RoomRoute(request, {} as any);
		if (!response) {
			ws.send(createMessage(data, false, 'missing response'));
			return;
		}
		const body = await response.json();
		if (response.status !== 200) {
			ws.send(createMessage(data, false, JSON.stringify(body)));
			return;
		}
		const room = db
			.query('SELECT * FROM rooms WHERE player1 = ? OR player2 = ? ')
			.get(playerData.id, playerData.id) as Room;
		ws.unsubscribe(`room-${room.id}`);
		ws.send(createMessage(data, true, 'Room left successfully'));
	}
};

export const wsMove = async (ws: ServerWebSocket<unknown>, data: any) => {
	const tokenStatus = verifyToken(data.token);
	if (tokenStatus === TokenVerifyResult.Invalid) {
		ws.send(createMessage(data, false, 'Token not found'));
		return;
	}
	if (tokenStatus === TokenVerifyResult.Expired) {
		ws.send(createMessage(data, false, 'Token expired'));
		return;
	}
	const token = db
		.query('SELECT * FROM tokens WHERE token = ?')
		.get(data.token) as Token;
	const sessionData = db
		.query('SELECT * FROM sessions WHERE user_id = ?')
		.get(token.user_id) as Session;
	const session = sessionData.id;
	const playerData = db
		.query('SELECT * FROM users WHERE id = ?')
		.get(token.user_id) as User;
	if (!playerData) {
		ws.send(createMessage(data, false, 'User not found'));
	}
	if (!data['column'] || data['column'] < 0 || data['column'] > 6) {
		ws.send(createMessage(data, false, 'Invalid column'));
		return;
	}
	const request = new Request('http://localhost:3000/api/games', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Cookie: `session=${session}`,
		},
		body: JSON.stringify({
			room_id: data.room_id,
			player_id: playerData.id,
			column: data.column,
		}),
	});
	const response = await RoomRoute(request, {} as any);
	if (!response) {
		ws.send(createMessage(data, false, 'Failed to place dice. Try again'));
		return;
	}
	const body = await response.json();
	if (response.status !== 200) {
		ws.send(createMessage(data, false, JSON.stringify(body)));
		return;
	}
	const table = db
		.query('SELECT * FROM games WHERE room_id = ?')
		.get(data.room_id) as Game;
	ws.send(createMessage(data, true, 'Dice placed successfully'));
	ws.publishText(
		`room-${data.room_id}`,
		createMessage(
			{
				type: 'move',
				action: 'update',
			},
			true,
			JSON.stringify({
				table: table.table_view,
				current_player_id: table.current_player,
			}),
		),
	);
	return;
};
