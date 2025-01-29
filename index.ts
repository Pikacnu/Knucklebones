import {
	DissconnectTime,
	RoomAliveTime,
	SessionAliveTime,
	TokenDeleteTime,
} from './config';
import { AccountRoute } from './src/apis/accounts';
import { RoomRoute } from './src/apis/room';
import { TokenRoute } from './src/apis/token';
import { db } from './src/utils/db';
import { wsMove, wsRoom, wsToken } from './src/websocket';

const port = 5173;

Bun.serve({
	port: port,
	static: {
		'/': new Response('Hello World', { status: 200 }),
		'/api/docs': new Response(await Bun.file('./src/docs/index.html').text(), {
			headers: { 'Content-Type': 'text/html' },
		}),
	},
	async fetch(request, server) {
		const url = new URL(request.url);
		if (url.pathname === 'ws') {
			server.upgrade(request, {});
			return;
		}

		if (url.pathname.startsWith('/api')) {
			const response = await AccountRoute(request, server);
			if (response) return response;
		}
		if (url.pathname.startsWith('/api/token')) {
			const response = await TokenRoute(request, server);
			if (response) return response;
		}

		if (url.pathname.startsWith('/api/rooms')) {
			const response = await RoomRoute(request, server);
			if (response) return response;
		}

		return new Response('Not found', { status: 404 });
	},
	websocket: {
		async open(ws) {
			ws.send(
				JSON.stringify({
					type: 'heartbeat',
					data: {
						delay: 1000 * 10,
					},
				}),
			);
		},
		async message(ws, message) {
			try {
				const data = JSON.parse(message.toString()) as {
					type: string;
					action: string;
					data: any;
				};
				if (data.type === 'heartbeat') {
					ws.send(
						JSON.stringify({
							type: 'heartbeat',
							data: {
								delay: 1000 * 10,
							},
						}),
					);
				}
				if (data.type === 'token') {
					await wsToken(ws, data);
					return;
				}
				if (data.type === 'room') {
					await wsRoom(ws, data);
					return;
				}
				if (data.type === 'move') {
					await wsMove(ws, data);
					return;
				}
				ws.send(
					JSON.stringify({
						type: data.data,
						action: 'error',
						data: {
							message: "don't have this type or action",
						},
					}),
				);
				return;
			} catch (e) {
				ws.send(
					JSON.stringify({
						type: 'Error',
						action: 'error',
						data: {
							message: 'Please pass JSON to server',
						},
					}),
				);
			}
		},
		async close(ws) {},
		async drain(ws) {},
	},
});

console.log(`Server is running on http://localhost:${port}`);

setInterval(() => {
	db.exec('DELETE FROM sessions WHERE created_at < ?', [
		new Date(Date.now() - SessionAliveTime).toISOString(),
	]);
	db.exec('DELETE FROM tokens WHERE created_at < ?', [
		new Date(Date.now() - TokenDeleteTime).toISOString(),
	]);
	db.exec('DELETE FROM rooms WHERE created_at < ?', [
		new Date(Date.now() - RoomAliveTime).toISOString(),
	]);
	db.exec('DELETE FROM games WHERE last_move_at < ? AND winner = ?', [
		new Date(Date.now() - DissconnectTime).toISOString(),
		null,
	]);
}, 1000 * 60 * 60);
