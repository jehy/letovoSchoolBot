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

const knex      = Knex(config.knex);
knex.client.on('start', captureQueries);

bot.on('polling_error', (error) => {
  debug(`Polling error: ${error.code}`);  // => 'EFATAL'
  debug(error);
});

bot.on('webhook_error', (error) => {
  debug(`Webhook error: ${error.code}`);  // => 'EPARSE'
});

async function checkAuthorised(userTelegramId)
{
  const name = knex('users').select('name').where({telegram_id: userTelegramId}).limit(1).first();
  return !!name;
}

async function authorise()
{
  return true;
}

// Matches "/echo [whatever]"
bot.onText(/\/start/, async (msg) => {
  debug('start message from user');
  debug(JSON.stringify(msg));
  // const chatId = msg.chat.id || msg.from.id;
  const userId = msg.from.id;
  const authorised = await checkAuthorised(userId);
  const generic = 'Вас приветствует бот для сообщения о проблемах в школе Летово.';
  if (authorised)
  {
    bot.sendMessage(userId, `${generic} Чтобы сообщить о проблеме, пожалуйста, используйте команду /add`);
  }
  else
  {
    bot.sendMessage(userId,
      `${generic} Чтобы представиться (для того, чтобы мы могли сообщить о решении проблемы),
      пожалуйста, используйте команду "/me" в формате "/me ФИО"`);
  }
});

// Listen for any kind of message. There are different kinds of
// messages.


bot.on('message', async (msg) => {
  debug(`message from user: ${JSON.stringify(msg)}`);
  if (!msg || msg.text === '/start') {
    debug('Empty or start message ignoring');
    return;
  }

  const userId = msg.from.id;
  if (msg.chat.type !== 'private') // group chat
  {
    bot.sendMessage(userId, 'Пожалуйста, пишите боту напрямую, а не в групповой чат.');
  }
  else // personal chat
  {
    if (msg.text.indexOf('/me') === 0)
    {
      await authorise(msg.text);
      return;
    }

    if (msg.text.indexOf('/add') === 0)
    {
      const opts = {
        reply_to_message_id: msg.message_id,
        reply_markup: {
          keyboard: [[config.categories]],
        },
      };
      bot.sendMessage(userId, 'Пожалуйста, выберите категорию проблемы', opts);
    }
  }
});
