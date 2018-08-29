'use strict';

exports.up = async (knex, Promise)=>{

  const usersCreate =  knex.schema.createTable('users', (t) => {
    t.increments('id').unsigned().primary();
    t.dateTime('added').notNull().index();
    t.string('name').notNull().index();
    t.string('telegram_nick').notNull().index();
    t.string('telegram_name').notNull().index();
    t.integer('telegram_id').notNull().unique();
  });
  const categoriesCreate =  knex.schema.createTable('categories', (t) => {
    t.increments('id').unsigned().primary();
    t.string('name').notNull().index();
  }).then(()=>{
    const categories = ['Пансион', 'Питание', 'Расписание', 'Здоровье', 'Общение,', 'Быт', 'Другое']
      .map(catName=>({name: catName}));
    return knex('categories').insert(categories);
  });
  const currentCategoryCreate =  knex.schema.createTable('current_category', (t) => {
    t.increments('id').unsigned().primary();
    t.integer('category_id').notNull().index();
    t.integer('user_id').notNull().index();
  });
  const userBlockCreate =  knex.schema.createTable('blocked', (t) => {
    t.increments('id').unsigned().primary();
    t.integer('user_id').notNull().index();
    t.dateTime('blocked').notNull().index();
    t.dateTime('blocked_until').notNull().index();
    t.string('reason').notNull().index();
  });

  return Promise.all([usersCreate, categoriesCreate, currentCategoryCreate, userBlockCreate]);
};

exports.down = async (knex, Promise)=>{
  const dropUsers =  knex.schema.dropTableIfExists('users');
  const dropCategories =  knex.schema.dropTableIfExists('categories');
  const dropCurrentCategory =  knex.schema.dropTableIfExists('current_category');
  const dropBlocked =  knex.schema.dropTableIfExists('blocked');
  return Promise.all([dropUsers, dropCategories, dropCurrentCategory, dropBlocked]);
};
