import { test, expect } from 'bun:test';
import { AccountRoute } from './accounts';

test('Create a new user', async () => {
	const request = new Request('http://localhost:5173/api/user', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			name: 'test',
			password: 'test',
		}),
	});
	const response = await AccountRoute(request, {} as any);
	if (!response) throw new Error('Response is null');
	expect(response.status).toBe(201);
	const data = await response.json();
	expect(data).toHaveProperty('message', 'Created');
});

let session = '';

async function login(username: string, password: string) {
	const request = new Request('http://localhost:5173/api/login', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			name: username,
			password: password,
		}),
	});
	const response = await AccountRoute(request, {} as any);
	if (!response) throw new Error('Response is null');
	return response;
}

test('login a user', async () => {
	const response = await login('test', 'test');
	const data = await response.json();
	session = response.headers.get('Set-Cookie') || '';
	expect(data).toHaveProperty('message', 'Logged in');
});

test('Get a user', async () => {
	const request = new Request('http://localhost:5173/api/user?name=test', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Cookie: `${session}`,
		},
	});
	const response = await AccountRoute(request, {} as any);
	if (!response) throw new Error('Response is null');
	expect(response.status).toBe(200);
	const data = await response.json();
	expect(data).toHaveProperty('name', 'test');
});

test('logout a user', async () => {
	const request = new Request('http://localhost:5173/api/logout', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Cookie: `${session}`,
		},
		body: JSON.stringify({
			name: 'test',
		}),
	});
	const response = await AccountRoute(request, {} as any);
	if (!response) throw new Error('Response is null');
	expect(response.status).toBe(200);
	const data = await response.json();
	expect(data).toHaveProperty('message', 'Logged out');
});

test('Delete a user', async () => {
	const loginData = await login('test', 'test');
	const session = loginData.headers.get('Set-Cookie') || '';
	const request = new Request('http://localhost:5173/api/user', {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
			Cookie: `${session}`,
		},
		body: JSON.stringify({
			name: 'test',
		}),
	});
	const response = await AccountRoute(request, {} as any);
	if (!response) throw new Error('Response is null');
	expect(response.status).toBe(200);
	const data = await response.json();
	expect(data).toHaveProperty('message', 'Deleted');
});
