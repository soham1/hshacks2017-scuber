'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Student = new Schema({
   userId: {type: Schema.Types.ObjectId, ref: 'User'},
   phone: Number,
   schoolName: String,
   name: String,
   fatherId: {type: Schema.Types.ObjectId, ref: 'Parent'},
   motherId: {type: Schema.Types.ObjectId, ref: 'Parent'},
   photo: String,
   homeLong: Number,
   homeLat: Number,
   schoolLong: Number,
   schoolLat: Number,
   email: String,
   waitingForRide: Boolean,
   miles: Number
});

module.exports = mongoose.model('Student', Student);