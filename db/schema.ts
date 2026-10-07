import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const rooms=sqliteTable('rooms',{code:text('code').primaryKey(),state:text('state').notNull(),version:integer('version').notNull().default(0),updatedAt:integer('updated_at').notNull()},table=>[index('idx_rooms_updated_at').on(table.updatedAt)]);
