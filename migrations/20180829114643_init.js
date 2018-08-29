'use strict';

exports.up = async (knex, Promise)=>{

  const usersCreate =  knex.schema.createTable('users', (t) => {
    t.dateTime('added').notNull().index();
    t.string('name').notNull().index();
    t.string('phone').index();
    t.string('telegram_nick').notNull().index();
    t.string('telegram_name').notNull().index();
    t.integer('id').notNull().unique();
  });
  const categoriesCreate =  knex.schema.createTable('categories', (t) => {
    t.increments('id').unsigned().primary();
    t.string('name').notNull().index();
  })
    .then(()=>knex.raw('ALTER TABLE categories AUTO_INCREMENT = 10000;\n'))
    .then(()=>{
      const categories = ['Пансион', 'Питание', 'Расписание', 'Здоровье', 'Общение', 'Быт', 'Другое']
        .map(catName=>({name: catName}));
      return knex('categories').insert(categories);
    });
  const userBlockCreate =  knex.schema.createTable('blocked', (t) => {
    t.increments('id').unsigned().primary();
    t.integer('user_id').notNull().index();
    t.dateTime('blocked').notNull().index();
    t.dateTime('blocked_until').notNull().index();
    t.string('reason').notNull().index();
  });

  const userActionCreate =  knex.schema.createTable('user_action', (t) => {
    t.dateTime('added').notNull().index();
    t.integer('user_id').notNull().index();
    t.integer('action_id').notNull().index();
  });

  const actionChoiceCreate =  knex.schema.createTable('action_choice', (t) => {
    t.dateTime('added').notNull().index();
    t.integer('choice_id').notNull().index();
    t.integer('action_id').notNull().index();
    t.integer('user_id').notNull().index();
  });

  const messageCreate =  knex.schema.createTable('messages', (t) => {
    t.increments('id').unsigned().primary();
    t.dateTime('added').notNull().index();
    t.integer('category_id').notNull().index();
    t.integer('user_id').notNull().index();
    t.integer('status').notNull().index();
    t.text('message').notNull();
  });

  return Promise.all([usersCreate, categoriesCreate, userBlockCreate, userActionCreate, actionChoiceCreate, messageCreate]);
};

exports.down = async (knex, Promise)=>{
  const dropUsers =  knex.schema.dropTableIfExists('users');
  const dropCategories =  knex.schema.dropTableIfExists('categories');
  const dropBlocked =  knex.schema.dropTableIfExists('blocked');
  const dropUserActions =  knex.schema.dropTableIfExists('user_action');
  const dropActionChoice =  knex.schema.dropTableIfExists('action_choice');
  const dropMessages =  knex.schema.dropTableIfExists('messages');
  return Promise.all([dropUsers, dropCategories, dropBlocked, dropUserActions, dropActionChoice, dropMessages]);
};
