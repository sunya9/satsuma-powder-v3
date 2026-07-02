import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`_about_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`version_content\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	\`autosave\` integer
  );
  `)
  await db.run(sql`CREATE INDEX \`_about_v_version_version__status_idx\` ON \`_about_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_about_v_created_at_idx\` ON \`_about_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_about_v_updated_at_idx\` ON \`_about_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_about_v_latest_idx\` ON \`_about_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_about_v_autosave_idx\` ON \`_about_v\` (\`autosave\`);`)
  await db.run(sql`ALTER TABLE \`_posts_v\` ADD \`autosave\` integer;`)
  await db.run(sql`CREATE INDEX \`_posts_v_autosave_idx\` ON \`_posts_v\` (\`autosave\`);`)
  await db.run(sql`ALTER TABLE \`about\` ADD \`_status\` text DEFAULT 'draft';`)
  await db.run(sql`CREATE INDEX \`about__status_idx\` ON \`about\` (\`_status\`);`)
  // Pre-drafts content was live on the site; without this it would turn into a
  // draft and vanish from the published API until manually re-published.
  await db.run(sql`UPDATE \`about\` SET \`_status\` = 'published';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`_about_v\`;`)
  await db.run(sql`DROP INDEX \`_posts_v_autosave_idx\`;`)
  await db.run(sql`ALTER TABLE \`_posts_v\` DROP COLUMN \`autosave\`;`)
  await db.run(sql`DROP INDEX \`about__status_idx\`;`)
  await db.run(sql`ALTER TABLE \`about\` DROP COLUMN \`_status\`;`)
}
