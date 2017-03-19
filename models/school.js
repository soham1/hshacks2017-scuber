'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var School = new Schema({
   schoolName: String,
   address: String,
   latitude: Number,
   longitude: Number
});

module.exports = mongoose.model('School', School);