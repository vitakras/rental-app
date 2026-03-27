import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';

const sqlite = new Database(process.env.DB_FILE_NAME!, { create: true, });

sqlite.run('PRAGMA foreign_keys = ON');
sqlite.run('PRAGMA journal_mode = WAL');
sqlite.run('PRAGMA synchronous = NORMAL');
sqlite.run('PRAGMA mmap_size = 128000000');
sqlite.run('PRAGMA journal_size_limit = 64000000');
sqlite.run('PRAGMA cache_size = 2000');

const db = drizzle(sqlite, { casing: 'snake_case' });
