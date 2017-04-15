'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Trip = new Schema({
   tripDate: Date,
   parentId: {type: Schema.Types.ObjectId, ref: 'Parent'},
   totalDistance: Number,
   isDone: Boolean
});

module.exports = mongoose.model('Trip', Trip);