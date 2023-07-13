import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
	schema: './db/schema.ts',
	dbCredentials: {
		connectionString: process.env.DATABASE_URL as string,
	},
	driver: 'mysql2',
} satisfies Config;
