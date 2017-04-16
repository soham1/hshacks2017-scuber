var Trip = require("../models/trip");
var mongoose = require("mongoose");
var TripRoute = require("../models/tripRoute");
var Student = require("../models/student");
var Parent = require("../models/parent");
var dateFormat = require("dateformat");

exports.report = reportHandler;
exports.parentRating = parentRating;
exports.studentRating = studentRating;
exports.parentRankingHandler = parentRankingHandler;
exports.studentRankingHandler = studentRankingHandler;
exports.recentRides = recentRides;

function reportHandler(req, res, next) {
  
  var routes = [];
  
  function tripsCallback(err, trips) {
    if (err) {
      console.log(err);
    } else {
      var trips = trips;
      TripRoute.find({}).populate('studentId').find({ 'studentId.fatherId': mongoose.Types.ObjectId(req.session.parent._id.toString()) }).exec(function(err, tripRoute){
        if(err){
          console.log("ERROR", err);
        } else {
          routesCallback(tripRoute);
          TripRoute.find({}).populate('studentId').find({ 'studentId.motherId': mongoose.Types.ObjectId(req.session.parent._id.toString()) }).exec(function(err, tripRoute){
            if(err){
              console.log("ERROR", err);
            } else {
              routesCallback(tripRoute);
            }
          });
        }
      });
      res.render('report', {
        trips: trips,
        routes: routes
      });
    }
  }
  
  function routesCallback(rs) {
      routes += rs;
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
  
  TripRoute.find({}).populate("tripId")
    .find({ 'tripId.parentId': pid })
    .exec(trCallback);
}

function studentRating(sid, trCallback) {
  
  TripRoute.find({ 'studentId': sid })
    .exec(trCallback);
  
}

function studentRankingHandler(callback) {
  return function(req, res, next) {
    return srHandler(req, res, next, callback);
  };
}

function srHandler(req, res, next, callback) {
  
  console.log("sr");
  
  function go(arr, index, result, cb) {
    if (index < arr.length) {
      studentRating(mongoose.Types.ObjectId(arr[index].id.toString()), function(err, trs) {
        var avg = null;
        if (err) {
          console.log("panic", err);
        }
        else {
          console.log("trs", trs);
          if (trs.length === 0) {
            console.log("it's empty");
            result[index] = {'name': arr[index].name, 'rating': 0};
          } else {
            for (var i = 0; i < trs.length; i++) {
              trs[i] = trs[i].studentRating;
            }
    
            var sum = trs.reduce(function(a, b) {
              return a + b;
            }, 0);
            avg = sum / (trs.length <= 0 ? 1 : trs.length);
    
            result[index] = {'name': arr[index].name, 'rating': avg};
          }
          
        }
        
        go(arr, index + 1, result, cb);
      });
    } else {
      cb(result)
    }
  }
  
  Student.find({}, function(err, ps) {
    if (err) {
      console.log("panic", err);
    } else {
      console.log("test", ps);
      for (var i = 0; i < ps.length; i++) {
        ps[i] = {'id': ps[i]._id, 'name': ps[i].name};
      }
      
      go(ps, 0, [], function (sres) {
        console.log("cherries");
        
        sres.sort(function(a, b) {
          return b.rating - a.rating;
        });
        
        callback(sres);
      });
      
    }
  });
}

function parentRankingHandler(callback) {
  return function(req, res, next) {
    return prHandler(req, res, next, callback);
  };
}

function prHandler(req, res, next, callback) {
  
  console.log("pr");
  
  function go(arr, index, result, cb) {
    if (index < arr.length) {
      parentRating(mongoose.Types.ObjectId(arr[index].id.toString()), function(err, trs) {
        var avg = null;
        if (err) {
          console.log("panic", err);
        }
        else {
          console.log("trs", trs);
          if (trs.length === 0) {
            console.log("it's empty");
            result[index] = {'name': arr[index].name, 'rating': 0};
          } else {
            for (var i = 0; i < trs.length; i++) {
              trs[i] = trs[i].parentRating;
            }
    
            var sum = trs.reduce(function(a, b) {
              return a + b;
            }, 0);
            avg = sum / (trs.length <= 0 ? 1 : trs.length);
    
            result[index] = {'name': arr[index].name, 'rating': avg};
          }
          
        }
        
        go(arr, index + 1, result, cb);
      });
    } else {
      cb(result)
    }
  }
  
  Parent.find({}, function(err, ps) {
    if (err) {
      console.log("panic", err);
    } else {
      console.log("test", ps);
      for (var i = 0; i < ps.length; i++) {
        ps[i] = {'id': ps[i]._id, 'name': ps[i].name};
      }
      
      go(ps, 0, [], function (pres) {
        console.log("grapes");
        
        console.log("typeof", typeof(pres))
        
        pres.sort(function(a, b) {
          return b.rating - a.rating;
        });
        
        callback(pres);
      });
      
    }
  });
}

function recentRides(req, res, next, cb) {
  
  function go(arr, index, acc, cb) {
    if (index < arr.length) {
      console.log("FCKFUCUFKCU", arr[index]);
      var tripId = arr[index].tripId;
      var destination = arr[index].destination;
      var parentRating = arr[index].parentRating;
      var studentRating = arr[index].studentRating;
      Trip.findOne({ _id: mongoose.Types.ObjectId(tripId.toString()) }, function(err, t) {
        if (err) {
          console.log("err", err);
          cb(err, null);
        } else {
          var date = dateFormat(t.tripDate, "ddd, m/d/yyyy hh:MMT")
          Parent.findOne({ _id: mongoose.Types.ObjectId(t.parentId.toString()) }, function(err, p) {
            if (err) {
              console.log("err", err);
              cb(err, null);
            } else {
              var parentName = p.name;
              acc[index] = {
                date: date,
                destination: destination,
                parentName: parentName,
                parentRating: parentRating,
                studentRating: studentRating
              };
              
              go(arr, index + 1, acc, cb);
            }
          });
        }
      });
    } else {
      cb(null, acc)
    }
  }
  
  if (!req.session.student) {
    console.log("student not logged in")
  } else {
    studentRating(mongoose.Types.ObjectId(req.session.student._id.toString()), function(err, trs) {
      if (err) {
        console.log("err", err);
      } else {
        go(trs, 0, [], cb);
      }
    });
  }
}