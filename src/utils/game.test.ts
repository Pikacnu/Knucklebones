import { describe, it, expect } from 'bun:test';
import {
	DetectWinWithTableView,
	scoreFromPlayerTable,
	placeDiceWithTableView,
	Player,
} from './game';

describe('DetectWinWithTableView', () => {
	it('should return null for an incomplete table', () => {
		const table = [
			[
				[1, 2, 3],
				[4, 5, 6],
				[0, 0, 0],
			],
			[
				[1, 2, 3],
				[4, 5, 6],
				[0, 0, 0],
			],
		];
		expect(DetectWinWithTableView(table)).toBe(null);
	});

	it('should throw an error for an invalid table view', () => {
		const table = [
			[
				[1, 2],
				[4, 5],
			],
			[
				[1, 2],
				[4, 5],
			],
		];
		expect(() => DetectWinWithTableView(table)).toThrow('Invalid table view');
	});

	it('should detect the winner correctly', () => {
		const table = [
			[
				[1, 2, 3],
				[4, 5, 6],
				[1, 2, 3],
			],
			[
				[1, 2, 3],
				[4, 5, 6],
				[1, 2, 0],
			],
		];
		expect(DetectWinWithTableView(table)).toBe(Player.Player1);
	});
});

describe('scoreFromPlayerTable', () => {
	it('should calculate the score correctly', () => {
		const table = [
			[1, 2, 3],
			[4, 5, 6],
			[7, 8, 9],
		];
		expect(scoreFromPlayerTable(table)).toBe(45);
	});

	it('should calculate the score correctly when duplicate', () => {
		const table = [
			[1, 1, 1],
			[2, 2, 3],
			[5, 6, 6],
		];
		expect(scoreFromPlayerTable(table)).toBe(9 + 11 + 29);
	});

	it('should throw an error for an invalid table', () => {
		const table = [
			[1, 2],
			[4, 5],
		];
		expect(() => scoreFromPlayerTable(table)).toThrow('Invalid table');
	});
});

describe('placeDiceWithTableView', () => {
	it('should place the dice correctly', () => {
		const table = [
			[
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0],
			],
			[
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0],
			],
		];
		const result = placeDiceWithTableView(table, Player.Player1, 2, 3);
		expect(result[0][2]).toEqual([0, 0, 3]);
	});

	it('should throw an error for an invalid table view', () => {
		const table = [
			[
				[0, 0],
				[0, 0],
			],
			[
				[0, 0],
				[0, 0],
			],
		];
		expect(() => placeDiceWithTableView(table, Player.Player1, 0, 3)).toThrow(
			'Invalid table view',
		);
	});

	it('should throw an error for a full column', () => {
		const table = [
			[
				[1, 2, 3],
				[0, 0, 0],
				[0, 0, 0],
			],
			[
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0],
			],
		];
		expect(() => placeDiceWithTableView(table, 1, 0, 3)).toThrow(
			'Column is full',
		);
	});

	it('should throw an error for an invalid number', () => {
		const table = [
			[
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0],
			],
			[
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0],
			],
		];
		expect(() => placeDiceWithTableView(table, 1, 0, 7)).toThrow(
			'Invalid number',
		);
	});
	it('should remove the dice correctly', () => {
		const table = [
			[
				[0, 0, 2],
				[0, 0, 0],
				[0, 0, 0],
			],
			[
				[0, 3, 3],
				[0, 0, 0],
				[0, 0, 0],
			],
		];
		const result = placeDiceWithTableView(table, Player.Player1, 0, 3);
		expect(result[1][0]).toEqual([0, 0, 0]);
	});

	it('should handle placing dice in an empty column', () => {
		const table = [
			[
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0],
			],
			[
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0],
			],
		];
		const result = placeDiceWithTableView(table, Player.Player2, 1, 4);
		expect(result[1][1]).toEqual([0, 0, 4]);
	});

	it('should handle placing dice in a partially filled column', () => {
		const table = [
			[
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0],
			],
			[
				[0, 0, 0],
				[0, 0, 4],
				[0, 0, 0],
			],
		];
		const result = placeDiceWithTableView(table, Player.Player2, 1, 5);
		expect(result[1][1]).toEqual([0, 4, 5]);
	});
});
