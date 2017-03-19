'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Student = new Schema({
   userId: {type: Schema.Types.ObjectId, ref: 'User'},
   phone: Number,
   schoolId: {type: Schema.Types.ObjectId, ref: 'School'},
   name: String,
   fatherId: {type: Schema.Types.ObjectId, ref: 'Parent'},
   motherId: {type: Schema.Types.ObjectId, ref: 'Parent'},
   photo: String,
   address: String,
   email: String,
   waitingForRide: Boolean,
   latitude: Number,
   longitude: Number,
   miles: Number
});

module.exports = mongoose.model('Student', Student);