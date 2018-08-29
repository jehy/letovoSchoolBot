'use strict';

exports.up = (knex) => {
  return knex.schema.alterTable('users', (t) => {
    return t.string('telegram_last_name').index();
  });
};

exports.down = (knex) => {
  return knex.schema.alterTable('logs', (t) => {
    return t.dropColumn('telegram_last_name');
  });
};
