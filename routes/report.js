var Trip = require("../models/trip");
var mongoose = require("mongoose");
var TripRoute = require("../models/tripRoute");
var Student = require("../models/student");
var Parent = require("../models/parent");

exports.report = reportHandler;
exports.parentRating = parentRating;
exports.studentRating = studentRating;
exports.parentRankingHandler = parentRankingHandler;
exports.studentRankingHandler = studentRankingHandler;

function reportHandler(req, res, next) {
  
  var routes = [];
  
  function tripsCallback(err, trips) {
    if (err) {
      console.log(err);
    } else {
      var trips = trips;
      TripRoute.find({}).populate('studentId').find({ 'studentId.fatherId': mongoose.Types.ObjectId(req.session.parent._id.toString()) }).exec(routesCallback);
      TripRoute.find({}).populate('studentId').find({ 'studentId.motherId': mongoose.Types.ObjectId(req.session.parent._id.toString()) }).exec(routesCallback);
      
      res.render('report', {
        trips: trips,
        routes: routes
      });
      
    }
  }
  
  function routesCallback(err, rs) {
    if (err) {
      console.log(err);
    } else {
      routes += rs;
    }
  }
  
  // Assume we're logged in. If not, panic
  if (!req.session.parent) {
    res.redirect("/?error=" + encodeURIComponent("true"));
  }
  
  Trip.find({ parentId: mongoose.Types.ObjectId(req.session.parent._id.toString()) })
    .sort({ tripDate: 'desc' })
    .exec(tripsCallback);
}

function parentRating(pid, trCallback) {
  
  var res = null;
  
  TripRoute.find({}).populate("tripId")
    .find({ 'tripId.parentId': pid })
    .exec(trCallback);
    
  return res;
}

function studentRating(sid, trCallback) {
  
  var res = null;
  
  TripRoute.find({ 'studentId': sid })
    .exec(trCallback);
    
  return res;
}

function studentRankingHandler(callback) {
  return function(req, res, next) {
    return srHandler(req, res, next, callback);
  };
}

function srHandler(req, res, next, callback) {
  
  var result = [];
  
  Student.find({}, function(err, ps) {
    if (err) {
      console.log("panic", err);
    } else {
      for (var i = 0; i < ps.length; i++) {
        ps[i] = ps[i].studentId;
        
        studentRating(mongoose.Types.ObjectId(ps[i].toString()), function(err, trs) {
          var avg = null;
          if (err) {
            console.log("panic", err);
          }
          else {
            for (var i = 0; i < trs.length; i++) {
              trs[i] = trs[i].studentRating;
            }
    
            var sum = trs.reduce(function(a, b) {
              return a + b;
            }, 0);
            avg = sum / (trs.length <= 0 ? 1 : trs.length);
    
            result += {'id': ps[i], 'rating': avg};
          }
        });
      }
      
      console.log("pizza");
      
      result.sort(function(a, b) {
        return b.rating - a.rating;
      });
      
      callback(result);
    }
  });
}

function parentRankingHandler(callback) {
  return function(req, res, next) {
    return prHandler(req, res, next, callback);
  };
}

function prHandler(req, res, next, callback) {
  
  var result = [];
  
  Parent.find({}, function(err, ps) {
    if (err) {
      console.log("panic", err);
    } else {
      for (var i = 0; i < ps.length; i++) {
        ps[i] = ps[i].parentId;
        
        parentRating(mongoose.Types.ObjectId(ps[i].toString()), function(err, trs) {
          var avg = null;
          if (err) {
            console.log("panic", err);
          }
          else {
            for (var i = 0; i < trs.length; i++) {
              trs[i] = trs[i].parentRating;
            }
    
            var sum = trs.reduce(function(a, b) {
              return a + b;
            }, 0);
            avg = sum / (trs.length <= 0 ? 1 : trs.length);
    
            result += {'id': ps[i], 'rating': avg};
          }
        });
      }
      
      console.log("grapes");
      
      result.sort(function(a, b) {
        return b.rating - a.rating;
      });
      
      callback(result);
    }
  });
}