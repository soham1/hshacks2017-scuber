'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TripRoute = new Schema({
   tripId: {type: Schema.Types.ObjectId, ref: 'Trip'},
   studentId: {type: Schema.Types.ObjectId, ref: 'Student'},
   stopOrder: Number,
   address: String,
   latitude: Number,
   longitude: Number,
   date: Date
});

module.exports = mongoose.model('TripRoute', TripRoute);