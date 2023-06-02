import { InferModel, sql } from 'drizzle-orm';
import { boolean, double, index, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';

export const products = mysqlTable('Product', {
	id: varchar('id', { length: 191 })
		.primaryKey()
		.default(sql`(uuid())`),
	createdAt: timestamp('createdAt').notNull().defaultNow(),
	updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
	name: varchar('name', { length: 191 }).notNull(),
	price: double('price'),
	desiredPrice: double('desiredPrice').notNull(),
	url: varchar('url', { length: 191 }).notNull(),
	imgUrl: varchar('imgUrl', { length: 191 }).notNull(),
	tag: varchar('tag', { length: 191 }),
	archived: boolean('archived').notNull(),
	lastNotifiedAt: timestamp('lastNotifiedAt'),
});

export const prices = mysqlTable(
	'Price',
	{
		id: varchar('id', { length: 191 })
			.primaryKey()
			.default(sql`(uuid())`),
		price: double('price'),
		createdAt: timestamp('createdAt').notNull().defaultNow(),
		productId: varchar('productId', { length: 191 }).notNull(),
	},
	table => ({
		productIdx: index('productIdx').on(table.productId),
	})
);

export type Product = InferModel<typeof products>;
