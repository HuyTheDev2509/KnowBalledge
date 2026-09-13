import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const gameSessions=sqliteTable('game_sessions',{id:text('id').primaryKey(),owner:text('owner').notNull(),state:text('state').notNull(),version:integer('version').notNull().default(0),expiresAt:integer('expires_at').notNull()});
export const footballCache=sqliteTable('football_cache',{id:text('id').primaryKey(),payload:text('payload').notNull(),updatedAt:integer('updated_at').notNull()});
