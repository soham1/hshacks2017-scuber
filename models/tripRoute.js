'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TripRoute = new Schema({
   tripId: {type: Schema.Types.ObjectId, ref: 'Trip'},
   studentId: {type: Schema.Types.ObjectId, ref: 'Student'},
   stopOrder: Number,
   destination: String,
   latitude: Number,
   longitude: Number,
   isDone: Boolean,
   distance: Number,
   parentRating: Number,
   studentRating: Number

});

module.exports = mongoose.model('TripRoute', TripRoute);