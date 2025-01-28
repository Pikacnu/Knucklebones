import { describe, it, expect, beforeEach } from 'bun:test';
import { AccountRoute } from './src/apis/accounts';
import { RoomRoute } from './src/apis/room';
import { TokenRoute } from './src/apis/token';
import { db } from './src/utils/db';
import { Player, type User } from './src/utils';

describe('Play A Game', () => {
	let sessionKeyPlayer1: string;
	let sessionKeyPlayer2: string;
	let player1Id: number;
	let player2Id: number;
	let roomId: number;
	let gameId: number = 1;

	beforeEach(async () => {
		db.exec('DELETE FROM users');
		db.exec('DELETE FROM sessions');
		db.exec('DELETE FROM tokens');
		db.exec('DELETE FROM rooms');
		db.exec('DELETE FROM games');

		// Create Player 1
		let request = new Request('http://localhost/api/user', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				name: 'player1',
				password: 'password123',
			}),
		});
		let response = await AccountRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(201);

		// Create Player 2
		request = new Request('http://localhost/api/user', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				name: 'player2',
				password: 'password123',
			}),
		});
		response = await AccountRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(201);

		// Login Player 1
		request = new Request('http://localhost/api/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				name: 'player1',
				password: 'password123',
			}),
		});
		response = await AccountRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(200);
		sessionKeyPlayer1 = response.headers.get('Set-Cookie')?.split('=')[1] || '';

		//Get Player 1 ID
		request = new Request('http://localhost/api/user?name=player1', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Cookie: `session=${sessionKeyPlayer1}`,
			},
		});
		response = await AccountRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(200);
		const player1: User = await response.json();
		player1Id = player1.id;

		// Login Player 2
		request = new Request('http://localhost/api/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				name: 'player2',
				password: 'password123',
			}),
		});
		response = await AccountRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(200);
		sessionKeyPlayer2 = response.headers.get('Set-Cookie')?.split('=')[1] || '';

		//Get Player 2 ID
		request = new Request('http://localhost/api/user?name=player2', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Cookie: `session=${sessionKeyPlayer2}`,
			},
		});
		response = await AccountRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(200);
		const player2: User = await response.json();
		player2Id = player2.id;

		// Create Room by Player 1
		request = new Request('http://localhost/api/rooms', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Cookie: `session=${sessionKeyPlayer1}`,
			},
			body: JSON.stringify({ player_id: player1Id }),
		});
		response = await RoomRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(201);
		let body = await response.json();
		roomId = body.room_id;

		// Join Room by Player 2
		request = new Request('http://localhost/api/rooms', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Cookie: `session=${sessionKeyPlayer2}`,
			},
			body: JSON.stringify({ room_id: roomId, player_id: player2Id }),
		});
		response = await RoomRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(200);

		// Start Game by Player 1
		request = new Request('http://localhost/api/games', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Cookie: `session=${sessionKeyPlayer1}`,
			},
			body: JSON.stringify({ room_id: roomId }),
		});
		response = await RoomRoute(request, {} as any);
		if (!response) throw new Error('Response is null');
		expect(response.status).toBe(201);
	});

	describe('Player 1 Turn', () => {
		it('should place dice on the table', async () => {
			const request = new Request('http://localhost/api/move', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: `session=${sessionKeyPlayer1}`,
				},
				body: JSON.stringify({
					column: 0,
				}),
			});
			const response = await RoomRoute(request, {} as any);
			if (!response) throw new Error('Response is null');
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.message).toBe('Dice placed');
		});
	});
	describe('Player 2 Turn', () => {
		it('should place dice on the table', async () => {
			//player 1 turn
			let request = new Request('http://localhost/api/move', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: `session=${sessionKeyPlayer1}`,
				},
				body: JSON.stringify({
					column: 0,
				}),
			});
			let response = await RoomRoute(request, {} as any);
			if (!response) throw new Error('Response is null');
			expect(response.status).toBe(200);
			let body = await response.json();
			expect(body.message).toBe('Dice placed');
			//player 2 turn
			request = new Request('http://localhost/api/move', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: `session=${sessionKeyPlayer2}`,
				},
				body: JSON.stringify({
					column: 0,
				}),
			});
			response = await RoomRoute(request, {} as any);
			if (!response) throw new Error('Response is null');
			expect(response.status).toBe(200);
			body = await response.json();
			expect(body.message).toBe('Dice placed');
		});
	});

	describe('Player 1 Turn With Wrong Placement', () => {
		it('should not place dice on the table', async () => {
			//first is player 1 turn
			let request = new Request('http://localhost/api/move', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: `session=${sessionKeyPlayer1}`,
				},
				body: JSON.stringify({
					column: 3,
				}),
			});
			let response = await RoomRoute(request, {} as any);
			if (!response) throw new Error('Response is null');
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe('Bad request');
		});
	});

	describe('Finish Game', () => {
		it('should finish the game', async () => {
			var body;
			let response;
			let request;

			async function placeDice(column: number, sessionKey: string) {
				request = new Request('http://localhost/api/move', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Cookie: `session=${sessionKey}`,
					},
					body: JSON.stringify({
						column: column,
					}),
				});
				response = await RoomRoute(request, {} as any);
				if (!response) throw new Error('Response is null');
				return response;
			}

			async function checkTable(gameId: number, player: Player) {
				request = new Request('http://localhost/api/games?game_id=' + gameId, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
					},
				});
				response = await RoomRoute(request, {} as any);
				if (!response) throw new Error('Response is null');
				body = await response.json();
				if (!body) throw new Error('Body is null');
				const table = JSON.parse(body.table_view);
				if (!table) throw new Error('Table is null');
				const columns = table[player - 1];
				if (!columns) throw new Error('Columns is null');
				let index;
				for (index = 0; index < columns.length; index++) {
					if (columns[index].some((num: number) => num === 0)) {
						break;
					}
				}
				return [index, body];
			}

			while (true) {
				//first is player 1 turn
				let [index, body] = await checkTable(gameId, Player.Player1);
				if (body.winner) {
					break;
				}
				response = await placeDice(index, sessionKeyPlayer1);
				if (!response) throw new Error('Response is null');
				body = await response.json();
				if (!body) throw new Error('Body is null');
				if (body.message === 'Game finished') {
					break;
				}
				expect(response.status).toBe(200);
				[index, body] = await checkTable(gameId, Player.Player2);
				if (body.winner) {
					break;
				}
				//player 2 turn
				response = await placeDice(index, sessionKeyPlayer2);
				if (!response) throw new Error('Response is null');
				body = await response.json();
				if (body.message === 'Game finished') {
					break;
				}
				expect(response.status).toBe(200);
			}
			if (!body) throw new Error('Body is null');
			//pass
			expect((body as any).winner).toBeDefined();
		});
	});
});
