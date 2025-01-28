import { Database } from 'bun:sqlite';

const db = new Database('knucklebones.sqlite', {
	create: true,
});

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL CHECK (length(password) >= 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);
//create index for sessions

db.exec(`
  CREATE INDEX IF NOT EXISTS sessions_created_at ON sessions(created_at);
  CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tokens (
    id TEXT PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

//create index for tokens
db.exec(`
  CREATE INDEX IF NOT EXISTS tokens_created_at ON tokens(created_at);
  CREATE INDEX IF NOT EXISTS tokens_user_id ON tokens(user_id);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY,
    current_player INTEGER NOT NULL,
    current_point INTEGER NOT NULL,
    winner INTEGER,
    room_id INTEGER NOT NULL,
    table_view TEXT DEFAULT '[[[0,0,0],[0,0,0],[0,0,0]],[[0,0,0],[0,0,0],[0,0,0]]]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    steps INTEGER DEFAULT 0,
    last_move_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (current_player) REFERENCES users(id),
    FOREIGN KEY (winner) REFERENCES users(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
    )
`);

//create index for games
db.exec(`
  CREATE INDEX IF NOT EXISTS games_current_player ON games(current_player);
  CREATE INDEX IF NOT EXISTS games_winner ON games(winner);
  CREATE INDEX IF NOT EXISTS games_room_id ON games(room_id);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    player1 INTEGER NOT NULL,
    player2 INTEGER,
    status VARCHAR(20) CHECK (status IN ('waiting','ongoing', 'completed', 'abandoned')) DEFAULT 'waiting',
    FOREIGN KEY (player1) REFERENCES users(id),
    FOREIGN KEY (player2) REFERENCES users(id)
    );
`);

//create index for rooms
/*
db.exec(`
  CREATE INDEX IF NOT EXISTS rooms_player1 ON rooms(player1);
  CREATE INDEX IF NOT EXISTS rooms_player2 ON rooms(player2);
  CREATE INDEX IF NOT EXISTS rooms_status ON rooms(status);
`);*/

db.exec(`
  CREATE TABLE IF NOT EXISTS moves (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    game_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    column INTEGER NOT NULL CHECK (column IN (0, 1, 2)),
    number INTEGER NOT NULL CHECK (number IN (0, 1, 2, 3, 4, 5, 6)),
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (player_id) REFERENCES users(id)
  );
`);

//create index for moves

db.exec(`
  CREATE INDEX IF NOT EXISTS moves_game_id ON moves(game_id);
  CREATE INDEX IF NOT EXISTS moves_player_id ON moves(player_id);
`);

db.exec('PRAGMA journal_mode = WAL;');

export { db };
