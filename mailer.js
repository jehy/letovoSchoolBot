'use strict';

const config = require('config');
const debug = require('debug')('letovoBot:mailer');
const Promise = require('bluebird');
const Knex = require('knex');
const Mailgun = require('mailgun-js');

const {Action, Status} = require('./meta');

const mailgun = Mailgun({apiKey: config.mailgun.apiKey, domain: config.mailgun.domain});
debug.enabled = true;

// Create a bot that uses 'polling' to fetch new updates

const captureQueries = function (builder) {
  builder.on('query', (query) => {
    debug(`Knex query:\n  ${query.sql}`);
  });
};

const knex = Knex(config.knex);
knex.client.on('start', captureQueries);

async function sendEmails()
{
  const messages = await knex('messages')
    .leftJoin('categories', 'messages.category_id', 'categories.id')
    .leftJoin('users', 'messages.user_id', 'users.id')
    .select('messages.id', 'users.name', 'users.phone', 'users.telegram_nick', 'users.telegram_name', 'users.telegram_last_name',
      'categories.name as category', 'messages.added', 'messages.message')
    .where('messages.status', Status.NEW);
  return Promise.map(messages, async (message)=>{
    const text = `Имя: ${message.name}\nТелефон: ${message.phone}\nНик в телеграмме: ${message.telegram_nick}`
      + `\nИмя в телеграмме: ${message.telegram_name}\nФамилия в телеграмме: ${message.telegram_last_name}\n`
      + `Категория: ${message.category}\n`
      + `Дата: ${message.added}\nСообщение: ${message.message}`;


    const html = `<b>Имя:</b> ${message.name}<br><b>Телефон:</b> ${message.phone}<br><b>Ник в телеграмме:</b> ${message.telegram_nick}`
      + `<br><b>Имя в телеграмме:</b> ${message.telegram_name}<br><b>Фамилия в телеграмме:</b> ${message.telegram_last_name}<br>`
      + `<b>Категория:</b> ${message.category}<br>`
      + `<b>Дата:</b> ${message.added}<br>Сообщение: ${message.message}`;

    let reply;
    try {
      reply = await mailgun.messages().send({
        from: config.mailgun.from,
        to: [config.mailgun.to],
        subject: `Проблема: ${message.category}`,
        text,
        html,
      });
      debug(reply);
      await knex('messages').update({status: Status.SENT}).where({id: message.id}).limit(1);
    } catch (err)
    {
      await knex('messages').update({status: Status.ERROR}).where({id: message.id}).limit(1);
      debug(`ERR: ${err}`);
    }
  });
}


async function checkMailQueue()
{
  while (true)
  {
    sendEmails();
    // eslint-disable-next-line no-await-in-loop
    await Promise.delay(10 * 1000);
  }
}

checkMailQueue();
