'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Parent = new Schema({
   userId: {type: Schema.Types.ObjectId, ref: 'User'},
   name: String,
   miles: {type: Number, default: 0},
   carMakeModel: String,
   seatsAvailable: Number,
   carPhoto: String,
   phone: Number,
   licensePlate: String,
   photo: String,
   email: String,
   available: Boolean
});

module.exports = mongoose.model('Parent', Parent);