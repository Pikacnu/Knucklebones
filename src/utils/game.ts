export enum Player {
	Player1 = 1,
	Player2 = 2,
}

function checkTable(table: number[][][]): void {
	if (
		table.length !== 2 ||
		table.some((player) => player.length !== 3) ||
		table.some((player) => player.some((cols) => cols.length !== 3)) ||
		table.some((player) =>
			player.some((cols) => cols.some((num) => !(0 <= num && num <= 6))),
		)
	) {
		throw new Error('Invalid table view');
	}
}

export function DetectWinWithTableView(table: number[][][]): Player | null {
	checkTable(table);
	if (
		!table.some((player) => !player.some((col) => col.some((num) => num === 0)))
	) {
		return null;
	}
	const scores = table.map((player) => scoreFromPlayerTable(player));
	return (scores.findIndex(
		(score) => score === scores.sort((a, b) => b - a)[0],
	) + 1) as Player;
}

function scoreFromColumn(column: number[]): number {
	if (column.length !== 3) {
		throw new Error('Invalid column');
	}
	const sameNumberCounts = column.map((num) => {
		let count = 0;
		if (num === 0) {
			return 0;
		}
		column.forEach((n) => {
			if (n === num) {
				count++;
			}
		});
		return count;
	});
	if (!sameNumberCounts.some((num) => num > 1)) {
		return column.reduce((acc, num) => acc + num, 0);
	}
	const sameNumberCount = sameNumberCounts.find((num) => num > 1);
	if (!sameNumberCount) {
		throw new Error('Invalid column');
	}

	const sameNumberIndex = sameNumberCounts.findIndex((num) => num > 1);
	const targetNumber = column[sameNumberIndex];
	return (
		targetNumber * Math.pow(sameNumberCount, 2) +
		column
			.filter((num) => num !== targetNumber)
			.reduce((acc, num) => acc + num, 0)
	);
}

export function scoreFromPlayerTable(table: number[][]): number {
	if (table.length !== 3) {
		throw new Error('Invalid table');
	}
	return table.reduce((acc, column) => acc + scoreFromColumn(column), 0);
}

export function placeDiceWithTableView(
	table: number[][][],
	player: number,
	column: number,
	number: number,
): number[][][] {
	checkTable(table);
	const index = player - 1;
	const otherPlayerIndex = index === 0 ? 1 : 0;
	if (number < 1 || number > 6) {
		throw new Error('Invalid number');
	}
	if (!table[index][column].some((num) => num === 0)) {
		throw new Error('Column is full');
	}
	const target = table[index][column].shift();
	if (target === undefined) {
		throw new Error('Invalid table view');
	}
	if (target !== 0) {
		throw new Error('Column is full');
	}
	table[index][column].push(number);
	const otherPlayerDeleteNumberArray = table[otherPlayerIndex][column].filter(
		(num) => num !== number,
	);
	table[otherPlayerIndex][column] = Array(
		3 - otherPlayerDeleteNumberArray.length,
	)
		.fill(0)
		.concat(otherPlayerDeleteNumberArray);
	return table;
}
