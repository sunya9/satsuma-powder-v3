import * as migration_20260627_054159_initial from './20260627_054159_initial';

export const migrations = [
  {
    up: migration_20260627_054159_initial.up,
    down: migration_20260627_054159_initial.down,
    name: '20260627_054159_initial'
  },
];
