import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`payload_query_presets\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`is_shared\` integer DEFAULT false,
  	\`access_read_constraint\` text DEFAULT 'onlyMe',
  	\`access_update_constraint\` text DEFAULT 'onlyMe',
  	\`access_delete_constraint\` text DEFAULT 'onlyMe',
  	\`where\` text,
  	\`columns\` text,
  	\`group_by\` text,
  	\`related_collection\` text NOT NULL,
  	\`is_temp\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_query_presets_updated_at_idx\` ON \`payload_query_presets\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_query_presets_created_at_idx\` ON \`payload_query_presets\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_query_presets_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_query_presets\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_query_presets_rels_order_idx\` ON \`payload_query_presets_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_query_presets_rels_parent_idx\` ON \`payload_query_presets_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_query_presets_rels_path_idx\` ON \`payload_query_presets_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_query_presets_rels_users_id_idx\` ON \`payload_query_presets_rels\` (\`users_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`payload_query_presets\`;`)
  await db.run(sql`DROP TABLE \`payload_query_presets_rels\`;`)
}
