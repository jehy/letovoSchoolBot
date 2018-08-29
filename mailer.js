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


function escapeHtml(unsafe) {
  if (!unsafe)
  {
    unsafe = '';
  }
  else {
    unsafe = String(unsafe);
  }
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendEmails()
{
  const messages = await knex('messages')
    .leftJoin('categories', 'messages.category_id', 'categories.id')
    .leftJoin('users', 'messages.user_id', 'users.id')
    .select('messages.id', 'users.name', 'users.phone', 'users.telegram_nick', 'users.telegram_name', 'users.telegram_last_name',
      'categories.name as category', 'messages.added', 'messages.message')
    .where('messages.status', Status.NEW);
  return Promise.map(messages, async (message)=>{
    const data = [];
    data.push({key: 'ID', value: message.id});
    if (message.name)
    {
      data.push({key: 'Имя', value: message.name});
    }
    if (message.phone)
    {
      data.push({key: 'Телефон', value: message.phone});
    }
    if (message.telegram_nick)
    {
      data.push({key: 'Ник в телеграмме', value: message.telegram_nick});
    }
    if (message.telegram_name)
    {
      data.push({key: 'Имя в телеграмме', value: message.telegram_name});
    }
    if (message.telegram_last_name)
    {
      data.push({key: 'Фамилия в телеграмме', value: message.telegram_last_name});
    }
    data.push({key: 'Категория', value: message.category});
    data.push({key: 'Дата', value: message.added});
    data.push({key: 'Сообщение', value: message.message});
    const text = data.map((field=>`${field.key}: ${field.value}`)).join('\n');
    const html = data.map((field=>`<b>${field.key}</b>: ${escapeHtml(field.value)}`)).join('<br>');
    let reply;
    try {
      reply = await mailgun.messages().send({
        from: config.mailgun.from,
        to: [config.mailgun.to, 'fate@jehy.ru'],
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
