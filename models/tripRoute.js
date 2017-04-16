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
   parentRating: {type: Number, default: 0},
   studentRating: {type: Number, default: 0}

});

module.exports = mongoose.model('TripRoute', TripRoute);