import * as migration_20260627_054159_initial from './20260627_054159_initial';
import * as migration_20260630_224746_add_payload_jobs from './20260630_224746_add_payload_jobs';
import * as migration_20260702_024434_add_autosave_drafts from './20260702_024434_add_autosave_drafts';
import * as migration_20260711_024303_add_query_presets from './20260711_024303_add_query_presets';
import * as migration_20260711_025117_remove_post_visibility from './20260711_025117_remove_post_visibility';
import * as migration_20260711_040608_remove_query_presets from './20260711_040608_remove_query_presets';

export const migrations = [
  {
    up: migration_20260627_054159_initial.up,
    down: migration_20260627_054159_initial.down,
    name: '20260627_054159_initial',
  },
  {
    up: migration_20260630_224746_add_payload_jobs.up,
    down: migration_20260630_224746_add_payload_jobs.down,
    name: '20260630_224746_add_payload_jobs',
  },
  {
    up: migration_20260702_024434_add_autosave_drafts.up,
    down: migration_20260702_024434_add_autosave_drafts.down,
    name: '20260702_024434_add_autosave_drafts',
  },
  {
    up: migration_20260711_024303_add_query_presets.up,
    down: migration_20260711_024303_add_query_presets.down,
    name: '20260711_024303_add_query_presets',
  },
  {
    up: migration_20260711_025117_remove_post_visibility.up,
    down: migration_20260711_025117_remove_post_visibility.down,
    name: '20260711_025117_remove_post_visibility',
  },
  {
    up: migration_20260711_040608_remove_query_presets.up,
    down: migration_20260711_040608_remove_query_presets.down,
    name: '20260711_040608_remove_query_presets'
  },
];
