import type { Server } from 'bun';
import { verifySession, type Session } from '../utils/user';
import { createToken } from '../utils/token';

export async function TokenRoute(request: Request, server: Server) {
	const url = new URL(request.url);

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

	const session = (await verifySession(sessionKey)) as Session | null;
	if (!session) {
		return new Response(JSON.stringify({ message: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (url.pathname.startsWith('/api/token')) {
		if (request.method === 'POST') {
			const token = createToken(session.user_id);
			return new Response(
				JSON.stringify({
					message: 'Token created',
					token: token,
				}),
				{
					headers: {
						'Content-Type': 'application/json',
					},
					status: 201,
				},
			);
		}
	}
	return null;
}
