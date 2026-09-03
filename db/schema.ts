import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const appState = sqliteTable('app_state', {
  ownerKey: text('owner_key').primaryKey().notNull(),
  payload: text('payload').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
