import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
export const records=sqliteTable("records",{id:text("id").primaryKey(),kind:text("kind").notNull(),data:text("data").notNull(),created:text("created").notNull()},t=>[index("records_kind_created").on(t.kind,t.created)]);
export const votes=sqliteTable("votes",{id:text("id").primaryKey(),pollId:text("poll_id").notNull(),voter:text("voter").notNull(),answer:integer("answer").notNull()},t=>[uniqueIndex("vote_once").on(t.pollId,t.voter)]);
