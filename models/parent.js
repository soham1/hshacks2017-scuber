'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Parent = new Schema({
   userId: {type: Schema.Types.ObjectId, ref: 'User'},
   name: String,
   miles: Number,
   carMakeModel: String,
   carPhoto: String,
   phone: Number,
   licensePlate: String,
   photo: String,
   email: String,
   available: Boolean,
   longitude: Number,
   latitude: Number
});

module.exports = mongoose.model('Parent', Parent);