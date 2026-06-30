import * as migration_20260627_054159_initial from './20260627_054159_initial';
import * as migration_20260630_224746_add_payload_jobs from './20260630_224746_add_payload_jobs';

export const migrations = [
  {
    up: migration_20260627_054159_initial.up,
    down: migration_20260627_054159_initial.down,
    name: '20260627_054159_initial',
  },
  {
    up: migration_20260630_224746_add_payload_jobs.up,
    down: migration_20260630_224746_add_payload_jobs.down,
    name: '20260630_224746_add_payload_jobs'
  },
];
