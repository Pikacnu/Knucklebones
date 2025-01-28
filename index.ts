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
		/*
		const cookies: Array<[string, string]> = request.headers
			.get('Cookie')
			?.split(';')
			.map((cookie) => {
				const parts = cookie.split('=');
				return [parts[0], parts[1] || ''];
			})!;
			*/

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
		async message(ws, message) {},
		async open(ws) {},
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
