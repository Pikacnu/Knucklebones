import type { Server } from 'bun';

import { verifySession, type User, type Room, type Game } from '../utils/user';

import { db } from '../utils/db';
import {
	DetectWinWithTableView,
	placeDiceWithTableView,
	Player,
} from '../utils/game';

export async function RoomRoute(request: Request, server: Server) {
	const cookies: Array<[string, string]> =
		request.headers
			.get('Cookie')
			?.split(';')
			.map((cookie) => {
				if (cookie === '') return ['', ''];
				const parts = cookie.split('=');
				return [parts[0], parts[1] || ''];
			}) || [];

	const sessionKey = cookies.find(([key]) => key === 'session')?.[1];

	const url = new URL(request.url);

	if (url.pathname.startsWith('/api/rooms')) {
		let body;
		try {
			body = await request.json();
		} catch (e) {
			return new Response(JSON.stringify({ error: 'Bad request' }), {
				status: 400,
			});
		}

		if (request.method === 'GET') {
			if (!['room_id', 'game_id'].some((key) => body[key])) {
				return new Response(JSON.stringify({ error: 'Bad request' }), {
					status: 400,
				});
			}
			const { room_id, game_id } = body;
			if (room_id) {
				const room = db.query('SELECT * FROM rooms WHERE id = ?').get(room_id);
				if (!room) {
					return new Response(JSON.stringify({ error: 'Not found' }), {
						status: 404,
					});
				}
				return new Response(JSON.stringify(room));
			}
			if (game_id) {
				const rooms = db
					.query('SELECT * FROM rooms WHERE game_id = ?')
					.all(game_id);
				if (!rooms) {
					return new Response(JSON.stringify({ error: 'Not found' }), {
						status: 404,
					});
				}
				return new Response(JSON.stringify(rooms));
			}
			return new Response(JSON.stringify({ error: 'Bad request' }), {
				status: 400,
			});
		}

		if (request.method === 'POST') {
			const session = await verifySession(sessionKey);
			if (!session) {
				return new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
				});
			}

			if (body['room_id']) {
				const room = db
					.query('SELECT * FROM rooms WHERE id = ?')
					.get(body['room_id']) as Room;
				if (!room) {
					return new Response(JSON.stringify({ error: 'Not found' }), {
						status: 404,
					});
				}
			}

			if (['player_id', 'room_id'].every((key) => body[key])) {
				const { player_id, room_id } = body;
				if (player_id !== session.user_id) {
					return new Response(JSON.stringify({ error: 'Bad request' }), {
						status: 400,
					});
				}
				const room = db
					.query('SELECT * FROM rooms WHERE id = ?')
					.get(room_id) as Room;
				if (!room) {
					return new Response(JSON.stringify({ error: 'Not found' }), {
						status: 404,
					});
				}
				if (!room) {
					return new Response(JSON.stringify({ error: 'Not found' }), {
						status: 404,
					});
				}
				db.query('UPDATE rooms SET player2 = ? WHERE id = ?').run(
					session.user_id,
					room.id,
				);
				return new Response(JSON.stringify({ message: 'Joined' }), {
					status: 200,
				});
			}

			const playerInGame = db
				.query('SELECT * FROM rooms WHERE player1 = ? OR player2 = ?')
				.get(session.user_id, session.user_id) as Room;
			if (playerInGame) {
				return new Response(JSON.stringify({ error: 'Already in a room' }), {
					status: 400,
				});
			}
			db.query('INSERT INTO rooms (player1) VALUES (?)').run(session.user_id);
			const room = db
				.query('SELECT * FROM rooms WHERE player1 = ?')
				.get(session.user_id) as Room;
			const roomid = room.id;

			return new Response(
				JSON.stringify({
					message: 'Room created',
					room_id: roomid,
				}),
				{ status: 201 },
			);
		}

		if (request.method === 'DELETE') {
			const session = await verifySession(sessionKey);
			if (!session) {
				return new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
				});
			}
			if (!body['room_id']) {
				return new Response(JSON.stringify({ error: 'Bad request' }), {
					status: 400,
				});
			}
			const room = db
				.query('SELECT * FROM rooms WHERE id = ?')
				.get(body['room_id']) as Room;

			if (!room) {
				return new Response(JSON.stringify({ error: 'Not found' }), {
					status: 404,
				});
			}
			const changeRows = db
				.query('DELETE FROM rooms WHERE id = ? AND player1 = ? OR player2 = ?')
				.run(body['room_id'], session.user_id, session.user_id);
			if (changeRows.changes === 0) {
				return new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
				});
			}
			return new Response(JSON.stringify({ message: 'Deleted' }), {
				status: 200,
			});
		}

		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
		});
	}

	if (url.pathname.startsWith('/api/games')) {
		if (request.method === 'GET') {
			const gameId = url.searchParams.get('game_id');
			if (!gameId) {
				return new Response(JSON.stringify({ error: 'Bad request' }), {
					status: 400,
				});
			}
			const game = db
				.query('SELECT * FROM games WHERE id = ?')
				.get(gameId) as Game;
			if (!game) {
				return new Response(JSON.stringify({ error: 'Not found' }), {
					status: 404,
				});
			}
			return new Response(JSON.stringify(game));
		}

		if (request.method === 'POST') {
			const session = await verifySession(sessionKey);
			if (!session) {
				return new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
				});
			}
			const room = db
				.query('SELECT * FROM rooms WHERE player1 = ? OR player2 = ?')
				.get(session.user_id, session.user_id) as Room;
			if (!room) {
				return new Response(JSON.stringify({ error: 'Not found' }), {
					status: 404,
				});
			}
			if (room.status !== 'waiting') {
				return new Response(JSON.stringify({ error: 'Game already started' }), {
					status: 400,
				});
			}
			db.query('UPDATE rooms SET status = "ongoing" WHERE id = ?').run(room.id);
			db.query(
				'INSERT INTO games (current_player, room_id, current_point) VALUES (?, ?, ?)',
			).run(session.user_id, room.id, Math.floor(Math.random() * 6) + 1);
			return new Response(JSON.stringify({ message: 'Start Game' }), {
				status: 201,
			});
		}
		if (request.method === 'DELETE') {
			const session = await verifySession(sessionKey);
			if (!session) {
				return new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
				});
			}
			const room = db
				.query('SELECT * FROM rooms WHERE player1 = ? OR player2 = ?')
				.get(session.user_id, session.user_id) as Room;
			if (!room) {
				return new Response(JSON.stringify({ error: 'Not found' }), {
					status: 404,
				});
			}
			const game = db
				.query('SELECT * FROM games WHERE room_id = ?')
				.get(room.id) as Game;
			if (!game) {
				if (room.status === 'completed') {
					return new Response(
						JSON.stringify({ error: 'Game already completed' }),
						{
							status: 400,
						},
					);
				}
				if (room.status === 'waiting') {
					if (room.player1 === session.user_id) {
						db.query('DELETE FROM rooms WHERE id = ?').run(room.id);
						return new Response(JSON.stringify({ message: 'Deleted' }), {
							status: 200,
						});
					}
					if (room.player2 === session.user_id) {
						db.query('UPDATE rooms SET player2 = NULL WHERE id = ?').run(
							room.id,
						);
						return new Response(JSON.stringify({ message: 'Deleted' }), {
							status: 200,
						});
					}
					return new Response(JSON.stringify({ error: 'Unauthorized' }), {
						status: 401,
					});
				}
				return new Response(JSON.stringify({ error: 'Not found' }), {
					status: 404,
				});
			}
			if (game.winner) {
				return new Response(
					JSON.stringify({ error: 'Game already completed' }),
					{
						status: 400,
					},
				);
			}
			db.query('DELETE FROM games WHERE id = ?').run(game.id);
			db.query('DELETE FROM rooms WHERE id = ?').run(room.id);
			return new Response(JSON.stringify({ message: 'Deleted' }), {
				status: 200,
			});
		}
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
		});
	}

	if (url.pathname.startsWith('/api/move')) {
		const session = await verifySession(sessionKey);

		if (!session) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
			});
		}

		let body;
		try {
			body = await request.json();
		} catch (e) {
			return new Response(
				JSON.stringify({ error: 'Bad request', message: 'Need Body' }),
				{
					status: 400,
				},
			);
		}
		if (isNaN(Number(body['column']))) {
			return new Response(
				JSON.stringify({
					error: 'Bad request',
					message: 'Need column in body',
				}),
				{
					status: 400,
				},
			);
		}

		const { column } = body;
		if (column < 0 || column > 2) {
			return new Response(
				JSON.stringify({
					error: 'Bad request',
					message: 'Column must be between 0 and 2',
				}),
				{
					status: 400,
				},
			);
		}

		const room = db
			.query('SELECT * FROM rooms WHERE player1 = ? OR player2 = ?')
			.get(session.user_id, session.user_id) as Room;

		if (!room) {
			return new Response(JSON.stringify({ error: 'Not found' }), {
				status: 404,
			});
		}

		const game = db
			.query('SELECT * FROM games WHERE room_id = ?')
			.get(room.id) as Game;

		if (!game) {
			return new Response(JSON.stringify({ error: 'Not found' }), {
				status: 404,
			});
		}

		if (game.current_player !== session.user_id) {
			return new Response(JSON.stringify({ error: 'Not your turn' }), {
				status: 400,
			});
		}

		db.query(
			'INSERT INTO moves (game_id, player_id, column, number) VALUES (?, ?, ?, ?)',
		).run(game.id, session.user_id, column, game.current_point);

		let table = JSON.parse(game.table_view) as Array<Array<Array<number>>>;
		try {
			placeDiceWithTableView(
				table,
				room.player1 === session.user_id ? Player.Player1 : Player.Player2,
				column,
				game.current_point,
			);
		} catch (e) {
			if (e instanceof Error) {
				return new Response(
					JSON.stringify({ error: 'Invalid placement', message: e.message }),
					{
						status: 400,
					},
				);
			}
			return new Response(
				JSON.stringify({
					error: 'Invalid placement',
					message: 'Unknown error',
				}),
				{
					status: 400,
				},
			);
		}

		const winner = DetectWinWithTableView(table);
		if (winner) {
			db.query('UPDATE rooms SET status = "completed" WHERE id = ?').run(
				room.id,
			);
		}
		db.query(
			'UPDATE games SET table_view = ?, current_player = ?, current_point = ?, winner = ?  WHERE id = ?',
		).run(
			JSON.stringify(table),
			room.player1 === session.user_id ? room.player2 : room.player1,
			Math.floor(Math.random() * 6) + 1,
			[null, room.player1, room.player2][winner ?? 0],
			game.id,
		);
		return new Response(JSON.stringify({ message: 'Dice placed' }), {
			status: 200,
		});
	}
	return null;
}
