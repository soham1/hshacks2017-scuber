'use strict';

var pushpad = require('pushpad');

// TODO: we should be using environmental variables for this
// TODO: Switch to the real thing and not just a test project
var PROJECT_ID = 3202;
var AUTH_TOKEN = "37a7416aa96a14b31c90cb24f1ff197f";

var project = new pushpad.Pushpad({
  authToken: AUTH_TOKEN,
  projectId: PROJECT_ID
});

module.exports.project = project;
