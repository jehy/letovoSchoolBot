'use strict';

const Action = {
  REPORT_PROBLEM: 1,
  ADD_NAME: 2,
  ADD_PHONE: 3,
};


const Status = {
  NEW: 1,
  SENT: 2,
  PROCESSED: 3,
  ERROR: 4,
};

module.exports = {
  Status,
  Action,
};
