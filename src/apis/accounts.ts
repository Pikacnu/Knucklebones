import type { Server } from 'bun';

import {
	type User,
	verifyUser,
	createUser,
	createSession,
	verifySession,
} from '../utils/user';

import { db } from '../utils/db';

export async function AccountRoute(request: Request, server: Server) {
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

	if (url.pathname.startsWith('/api/login')) {
		if (request.method === 'POST') {
			let data;
			try {
				data = await request.json();
			} catch (e) {
				return new Response(JSON.stringify({ message: 'Bad request' }), {
					status: 400,
				});
			}
			if (!data || ['name', 'password'].some((key) => !data[key])) {
				return new Response(JSON.stringify({ message: 'Bad request' }), {
					status: 400,
				});
			}
			if (sessionKey) {
				return new Response(JSON.stringify({ message: 'Already logged in' }), {
					status: 400,
				});
			}
			const { name, password } = data;
			if (await verifyUser(name, password)) {
				if (url.searchParams.has('redirect')) {
					const redirect = url.searchParams.get('redirect');
					if (redirect === null || redirect.trim().length < 7)
						return new Response(JSON.stringify({ message: 'Bad request' }), {
							status: 400,
						});
					try {
						const url = new URL(redirect);
						if (url.origin !== Bun.env.ORIGIN) {
							return new Response(JSON.stringify({ message: 'Unauthorized' }), {
								status: 401,
							});
						}
					} catch (e) {
						return new Response(JSON.stringify({ message: 'Bad request' }), {
							status: 400,
						});
					}
					const sessionKey = await createSession(name);
					return new Response(JSON.stringify({ message: 'Redirecting' }), {
						status: 302,
						headers: new Headers({
							'Set-Cookie': `session=${sessionKey}; HttpOnly; Secure; SameSite=Strict`,
							Location: url.searchParams.get('redirect') || '/',
						}),
					});
				}
				const sessionKey = await createSession(name);
				return new Response(JSON.stringify({ message: 'Logged in' }), {
					status: 200,
					headers: {
						'Set-Cookie': `session=${sessionKey}; HttpOnly; Secure; SameSite=Strict`,
					},
				});
			}
			return new Response(JSON.stringify({ message: 'Unauthorized' }), {
				status: 401,
			});
		}
		return new Response(JSON.stringify({ message: 'Not found' }), {
			status: 404,
		});
	}

	if (url.pathname.startsWith('/api/logout')) {
		if (request.method === 'POST') {
			if (!sessionKey) {
				return new Response(JSON.stringify({ message: 'Not logged in' }), {
					status: 400,
				});
			}
			return new Response(JSON.stringify({ message: 'Logged out' }), {
				status: 200,
				headers: {
					'Set-Cookie':
						'session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
				},
			});
		}
		return new Response(JSON.stringify({ message: 'Not found' }), {
			status: 404,
		});
	}

	if (url.pathname.startsWith('/api/user')) {
		if (request.method === 'GET') {
			const name = url.searchParams.get('name');
			const id = url.searchParams.get('id');

			if (!name && !id) {
				return new Response(JSON.stringify({ message: 'Bad request' }), {
					status: 400,
				});
			}
			const user = db
				.query('SELECT * FROM users WHERE name = ? OR id = ?')
				.get(name, id) as User;
			if (user) {
				return new Response(JSON.stringify(user));
			}
		}
		if (request.method === 'POST') {
			let data;
			try {
				data = await request.json();
			} catch (e) {
				return new Response(JSON.stringify({ message: 'Bad request' }), {
					status: 400,
				});
			}
			if (!data || ['name', 'password'].some((key) => !data[key])) {
				return new Response(JSON.stringify({ message: 'Bad request' }), {
					status: 400,
				});
			}
			const { name, password } = data;
			try {
				await createUser(name, password);
				return new Response(JSON.stringify({ message: 'Created' }), {
					status: 201,
				});
			} catch (e) {
				return new Response(
					JSON.stringify({ message: 'User already exists' }),
					{ status: 400 },
				);
			}
		}
		if (request.method === 'PUT') {
			let data;
			try {
				data = await request.json();
			} catch (e) {
				return new Response(JSON.stringify({ message: 'Bad request' }), {
					status: 400,
				});
			}
			if (!data || ['name', 'password'].some((key) => !data[key])) {
				return new Response(JSON.stringify({ message: 'Bad request' }), {
					status: 400,
				});
			}
			const { name, password } = data;
			const session = await verifySession(sessionKey);
			if (!session) {
				return new Response(JSON.stringify({ message: 'Unauthorized' }), {
					status: 401,
				});
			}
			const user = db
				.query('SELECT * FROM users WHERE name = ?')
				.get(name) as User;
			const hash = await Bun.password.hash(password);
			db.query('UPDATE users SET password = ? WHERE id = ?').run(hash, user.id);
			return new Response(JSON.stringify({ message: 'Updated' }), {
				status: 200,
			});
		}
		if (request.method === 'DELETE') {
			const session = await verifySession(sessionKey);
			if (!session) {
				return new Response(JSON.stringify({ message: 'Unauthorized' }), {
					status: 401,
				});
			}
			const user = db
				.query('SELECT * FROM users WHERE id = ?')
				.get(session.user_id) as User;
			db.query('DELETE FROM users WHERE id = ?').run(user.id);
			return new Response(JSON.stringify({ message: 'Deleted' }), {
				status: 200,
			});
		}
		return null;
	}
}
