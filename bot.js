'use strict';

const TelegramBot = require('node-telegram-bot-api');
const config = require('config');
const debug = require('debug')('letovoBot');
const Promise = require('bluebird');
const Knex = require('knex');

debug.enabled = true;
const {token} = config.telegram;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

const captureQueries = function (builder) {
  builder.on('query', (query) => {
    debug(`Knex query:\n  ${query.sql}`);
  });
};

const knex = Knex(config.knex);
knex.client.on('start', captureQueries);
let categories;

const Action = {
  REPORT_PROBLEM: 1,
  ADD_NAME: 2,
  ADD_PHONE: 3,
};


const Status = {
  NEW: 1,
  SENT: 2,
  PROCESSED: 3,
};

bot.on('polling_error', (error) => {
  debug(`Polling error: ${error.code}`);  // => 'EFATAL'
  debug(error);
});

bot.on('webhook_error', (error) => {
  debug(`Webhook error: ${error.code}`);  // => 'EPARSE'
});

async function init()
{
  categories = await knex('categories').select('id', 'name');
}
init();

async function checkAuthorised(from) {
  const user = await knex('users').select('name', 'id', 'phone').where({id: from.id}).limit(1).first();
  if (!user)
  {
    return {
      id: false,
      phone: false,
      name: false,
    };
  }
  if (!user.id) {
    await knex('users').insert({
      added: knex.fn.now(),
      name: '',
      telegram_nick: from.username,
      id: from.id,
      telegram_name: from.first_name,
    });
  }
  return user;
}

async function ensureUserExists(from)
{
  const user = await knex('users').select('id').where({id: from.id}).limit(1).first();
  if (!user) // should not happen but just in case...
  {
    await knex('users').insert({
      added: knex.fn.now(),
      name: '',
      telegram_nick: from.username,
      id: from.id,
      telegram_name: from.first_name,
    });
  }
}

async function showMenu(msg, text)
{
  // const chatId = msg.chat.id || msg.from.id;
  const userId = msg.from.id;
  const user = await checkAuthorised(msg.from);
  const startButtons = [{
    text: 'сообщить о проблеме',
    callback_data: Action.REPORT_PROBLEM,
  }];
  if (!user.name)
  {
    startButtons.push({
      text: 'представиться',
      callback_data: Action.ADD_NAME,
    });
  }
  const opts = {
    reply_markup: JSON.stringify({
      remove_keyboard: true,
      inline_keyboard: startButtons.map(btn=>[btn]),
      one_time_keyboard: true,
      resize_keyboard: true,
    }),
  };
  bot.sendMessage(userId, text, opts);
  if (!user.phone)
  {
    const phoneButton = [];
    phoneButton.push({
      text: 'передать номер телефона',
      request_contact: true,
    });
    const opts2 = {
      reply_markup: JSON.stringify({
        remove_keyboard: true,
        keyboard: phoneButton.map(btn=>[btn]),
        one_time_keyboard: true,
        resize_keyboard: true,
      }),
    };
    await Promise.delay(100);
    bot.sendMessage(userId, 'Так же рекомендуем вам прелоставить номер телефона для ответа нажатием кнопки снизу', opts2);
  }
}

// Matches "/echo [whatever]"
bot.onText(/\/start/, async (msg) => {
  debug('start message from user');
  const startText = 'Вас приветствует бот для сообщения о проблемах в школе Летово. Вы можете:';
  await showMenu(msg, startText);
});

// Listen for any kind of message. There are different kinds of
// messages.

bot.on('callback_query', async (callbackQuery)=>{
  debug(`callback: ${JSON.stringify(callbackQuery)}`);
  const userId = callbackQuery.from.id;
  const action = parseInt(callbackQuery.data, 10);
  if (action === Action.ADD_NAME)
  {
    await knex('user_action').delete().where({user_id: userId});
    await knex('user_action').insert({
      user_id: userId,
      action_id: Action.ADD_NAME,
      added: knex.fn.now(),
    });
    const opts2 = {
      reply_markup: JSON.stringify({
        remove_keyboard: true,
      }),
    };
    bot.sendMessage(userId, 'Пожалуйста, введите имя (как обычное сообщение в чат).', opts2);
    return;
  }
  if (action === Action.REPORT_PROBLEM)
  {
    await knex('user_action').delete().where({user_id: userId});
    await knex('user_action').insert({
      user_id: userId,
      action_id: Action.REPORT_PROBLEM,
      added: knex.fn.now(),
    });
    const keyboard =  categories.map(cat=>({text: cat.name, callback_data: cat.id}));
    const opts = {
      reply_markup: {
        remove_keyboard: true,
        inline_keyboard: keyboard.map(el=>[el]),
        one_time_keyboard: true,
        resize_keyboard: false,
      },
    };
    bot.sendMessage(userId, 'Пожалуйста, выберите категорию проблемы', opts);
    return;
  }
  const res = await knex('user_action').select('action_id').where({user_id: userId}).limit(1).first();
  const chosenCategory = await knex('categories').select('name').where({id: action}).limit(1).first();
  let error = false;
  if (!res)
  {
    debug(`current action for user ${userId} not found`);
    error = true;
  }
  if (!chosenCategory)
  {
    debug(`Category ${action} not found`);
    error = true;
  }
  if (res && res.action_id !== Action.REPORT_PROBLEM)
  {
    debug(`Unexpected action ${res.action_id}`);
    error = true;
  }
  if (error)
  {
    const startText = 'Что-то пошло не так, пожалуйста, попробуйте снова:';
    await knex('user_action').delete().where({user_id: userId});
    await showMenu(callbackQuery, startText);
    return;
  }
  const opts2 = {
    reply_markup: JSON.stringify({
      remove_keyboard: true,
    }),
  };
  await knex('action_choice').delete().where({user_id: userId});
  await knex('action_choice').insert({
    user_id: userId,
    action_id: Action.REPORT_PROBLEM,
    choice_id: action,
    added: knex.fn.now(),
  });
  bot.sendMessage(userId, `Вы выбрали категорию "${chosenCategory.name}".`
    + 'Пожалуйста, введите описание проблемы (как обычное сообщение в чат).', opts2);
});

bot.on('contact', async (msg) => {
  await ensureUserExists(msg.from);
  const {contact} = msg;
  if (contact && contact.user_id && contact.phone_number) {
    await knex('users').update({phone: contact.phone_number}).where({id: contact.user_id}).limit(1);
  }
  const startText = 'Спасибо за указание телефона! Вы можете:';
  await showMenu(msg, startText);
});

bot.on('message', async (msg, meta) => {
  debug(`msg : ${JSON.stringify(msg)}, meta: ${JSON.stringify(meta)}`);
  await ensureUserExists(msg.from);
  if (meta && meta.type === 'contact' || msg.data)
  {
    return;
  }
  if (!msg || !msg.text || msg.text === '/start') {
    debug('Empty or start message, ignoring');
    return;
  }

  const userId = msg.from.id;
  if (msg.chat.type !== 'private') // group chat
  {
    bot.sendMessage(userId, 'Пожалуйста, пишите боту напрямую, а не в групповой чат.');
    return;
  }

  const res = await knex('user_action').select('action_id').where({user_id: userId}).limit(1).first();
  if (!res) {
    const opts = {
      reply_markup: {
        remove_keyboard: true,
      },
    };
    bot.sendMessage(userId, 'Простите, я пока не умею так.', opts);
    return;
  }
  const actionId = res.action_id;
  if (actionId === Action.ADD_NAME)
  {
    const name = msg.text.trim();
    await knex('users').update({name}).where({id: userId}).limit(1);
    const startText = 'Спасибо что представились!';
    await knex('user_action').delete().where({user_id: userId});
    await showMenu(msg, startText);
  }
  if (actionId === Action.REPORT_PROBLEM)
  {
    const choice = await knex('action_choice').select('choice_id')
      .where({user_id: userId, action_id: Action.REPORT_PROBLEM}).limit(1).first();
    if (!choice)
    {
      const opts = {
        reply_markup: {
          remove_keyboard: true,
        },
      };
      bot.sendMessage(userId, 'Пожалуйста, выберите категорию проблемы', opts);
      return;
    }
    const message = msg.text.trim();
    await knex('messages').insert(
      {
        added: knex.fn.now(),
        user_id: userId,
        message,
        status: Status.NEW,
        category_id: choice.choice_id,
      },
    );
    await knex('user_action').delete().where({user_id: userId});
    await knex('action_choice').delete().where({user_id: userId});
    const startText = 'Спасибо, что помогаете нам! Сервис работает в тестовом режиме, но мы постараемся сообщить вам о результатах работы.';
    await showMenu(msg, startText);
  }
});
