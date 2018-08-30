# letovoSchoolBot

[![dependencies Status](https://david-dm.org/jehy/letovoSchoolBot/status.svg)](https://david-dm.org/jehy/letovoSchoolBot)
[![devDependencies Status](https://david-dm.org/jehy/letovoSchoolBot/dev-status.svg)](https://david-dm.org/jehy/letovoSchoolBot?type=dev)

Simple bor for reporting problems at school.
You can provide your telegram details, phone, name and report a problem in particular
category.

You can find this bot on telegram as  `@letovoSchoolBot`.

**Requirements:**
* Mysql, mariadb or another RDBMS (may require some work)
* Mailgun account

**Config:**
```json
{
  "telegram": {
    "token": "YOUR_TELEGRAM_BOT_TOKEN"
  },
  "knex": {
    "client": "mysql",
    "connection": {
      "host": "localhost",
      "user": "user",
      "password": "password",
      "database": "database"
    }
  },
  "mailgun":
  {
    "apiKey": "xxx",
    "username": "yyy",
    "to": "receiver@mail.com",
    "from": "sender@mail.com",
    "domain": "www.domain.com"
  }
}
```
**Starting**
1. Create database, create user, grant permissions (for data in config)
2. Run `npm run migrate` to create database
3. Start bot with the following commands:
    * `npm start` to start all
    * `npm run bot` to run only telegram bot
    * `npm run mailer` to run only mailer
    * `pm2 start ./pm2.json` to run mailer and bot as separate services via pm2

