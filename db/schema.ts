import { InferModel, sql, relations } from 'drizzle-orm';
import { boolean, double, index, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';

export const products = mysqlTable('Product', {
	id: varchar('id', { length: 256 })
		.primaryKey()
		.default(sql`(uuid())`),
	createdAt: timestamp('createdAt').notNull().defaultNow(),
	updatedAt: timestamp('updatedAt').notNull().defaultNow().onUpdateNow(),
	name: varchar('name', { length: 256 }).notNull(),
	price: double('price'),
	desiredPrice: double('desiredPrice').notNull(),
	url: varchar('url', { length: 256 }).notNull(),
	imgUrl: varchar('imgUrl', { length: 256 }).notNull(),
	tag: varchar('tag', { length: 256 }).notNull(),
	archived: boolean('archived').notNull(),
	lastNotifiedAt: timestamp('lastNotifiedAt'),
});

export const productsRelations = relations(products, ({ many }) => ({
	prices: many(prices),
}));

export const prices = mysqlTable(
	'Price',
	{
		id: varchar('id', { length: 256 })
			.primaryKey()
			.default(sql`(uuid())`),
		price: double('price'),
		createdAt: timestamp('createdAt').notNull().defaultNow(),
		productId: varchar('productId', { length: 256 }).notNull(),
	},
	table => ({
		productIdx: index('productIdx').on(table.productId),
	})
);

export const pricesRelations = relations(prices, ({ one }) => ({
	product: one(products, { fields: [prices.productId], references: [products.id] }),
}));

export type Product = InferModel<typeof products>;

export type Price = InferModel<typeof prices>;
