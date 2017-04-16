//IMPORTANT: EVERY ROUTE YOU WRITE MUST HAVE A COMMENT ON TOP EXPLAINING WHAT IT DOES!

var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var User = require("../models/user.js");
var Parent = require("../models/parent.js");
var Student = require("../models/student.js");
var TripRoute = require("../models/tripRoute.js");
var Trip = require("../models/trip.js");
var rp = require('request-promise');
var _ = require('lodash');

var report = require('./report');

//Haversine Formula
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1); // deg2rad below
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
}

//Degrees to Radians
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// TODO: Redirect to dashboard if logged in (implement after logging out is implemented)
//Index Route
router.get('/', function(req, res, next) {
  console.log("isMobile", req.isMobile);
  var error = req.query.error;
  console.log(error);
  if (req.session.user) {
    res.redirect('/dashboard');
  }
  if (req.isMobile) {
    res.render('index-m');
  }
  else {
    res.render('index');
  }
});

//Parent is available, updates status, and emits to matchmaker findStudent method
router.get('/available/:lat/:long', function(req, res, next) {
  Parent.update({
    _id: mongoose.Types.ObjectId(req.session.parent._id.toString()),
    latitude: req.params.lat,
    longitude: req.params.long
  }, {
    $set: {
      available: true
    }
  }, function() {
    console.log("EMITTING FIND STUDENT parent id=", req.session.parent._id);
    req.app.emit('event:findStudent', {
      parent: req.session.parent
    });
    console.log('PARENT ID GIVEN TO THANKS FOR AVAILABLE', req.session.parent);
    res.render('thanksForAvailable.ejs', {
      parentId: req.session.parent._id
    });
  });
});

//Register Student
router.get('/register', function(req, res, next) {
  res.render('register.ejs');
});

//Student wants a ride, emits to matchmaker.js requestRide method.
router.get('/findRide', function(req, res, next) {
  console.log("INSIDE FIND RIDE");
  Student.update({
    _id: req.session.student._id
  }, {
    $set: {
      waitingForRide: true
    }
  }, function() {
    console.log("EMMITITIG REQUEST RIDE");
    req.app.emit('event:requestRide', {
      student: req.session.student
    });
    res.render('thanksForAskingRide.ejs', {
      studentId: req.session.student._id
    });
  });
});

//Register Parent
router.get('/register-parent', function(req, res, next) {
  res.render('register-parent.ejs');
});

//Student asks for ride, confirmation page, uses Haversine to find destination, gives chance to change destination
router.post('/confirmRide', function(req, res, next) {
  var currToSchool = getDistanceFromLatLonInKm(req.body.currLat, req.body.currLong, req.session.schoolLat, req.session.schoolLong);
  var currToHome = getDistanceFromLatLonInKm(req.body.currLat, req.body.currLong, req.session.homeLat, req.session.homeLong);
  var destination = "School";
  if (currToSchool > currToHome) {
    destination = "Home";
  }
  console.log("DESTINATION", destination);
  Student.update({
    _id: req.session.student._id
  }, {
    $set: {
      destination: destination
    }
  }, function() {
    res.render('confirmRide.ejs', {
      destination: destination,
      student: req.session.student
    });
  });
});

//Post for registering parent.
router.post('/register-parent', function(req, res, next) {
  var user = new User({
    username: req.body.username,
    password: req.body.password,
    type: "Parent"
  });

  user.save(function(err) {
    if (err) {
      console.log("error in saving user");
      res.redirect("/");
    }
    else {
      req.session.user = user;
      var parent = new Parent({
        userId: mongoose.Types.ObjectId(user._id.toString()),
        phone: req.body.phone,
        carPhoto: req.body.carPhoto,
        carMakeModel: req.body.carMakeModel,
        licensePlate: req.body.licensePlate,
        photo: req.body.photo,
        name: req.body.name,
        email: req.body.email,
        available: false,
        seatsAvailable: req.body.seatsAvailable
      });

      parent.save(function(err, updatedParent) {
        if (err) {
          return ("ERROR", err);
        }
        else {
          req.session.parent = updatedParent;
          if (req.body.relation == "father") {
            Student.findById(req.session.student._id, function(err, student) {
              if (err) {
                return ("ERROR", err);
              }
              else {
                student.fatherId = req.session.parent._id;
                student.save(function(err, updatedStudent) {
                  if (err) {
                    return ("ERROR", err);
                  }
                });
              }
            });
          }
          else {
            Student.findById(req.session.student._id, function(err, student) {
              if (err) {
                return ("ERROR", err);
              }
              else {
                student.motherId = req.session.parent._id;
                student.save(function(err, updatedStudent) {
                  if (err) {
                    return ("ERROR", err);
                  }
                });
              }
            });
          }
          res.redirect('/dashboard');
        }
      });
    }
  });
});

// Students can only register parents in the dashboard*
// Post for student registration.
router.post('/register', function(req, res, next) {
  var schoolLat;
  var schoolLong;
  var homeLat;
  var homeLong;
  console.log("Inside register post");
  console.log("pw given: " + req.body.password);
  var user = new User({
    username: req.body.username,
    password: req.body.password,
    type: "Student"
  });

  user.save(function(err) {
    if (err) {
      return ("ERROR IN USER", err);
    }
    else {
      console.log("inside saving student");

      var schoolOptions = {
        uri: 'https://maps.googleapis.com/maps/api/geocode/json',
        qs: {
          key: 'AIzaSyDdlNYvhqPXvCEOClkJe2vPZCnPBnmFfXw',
          address: req.body.schoolAddress
        },
        headers: {
          'User-Agent': 'Request-Promise'
        },
        json: true // Automatically parses the JSON string in the response
      };

      rp(schoolOptions)
        .then(function(schoolAddress) {
          schoolLat = schoolAddress.results[0].geometry.location.lat;
          schoolLong = schoolAddress.results[0].geometry.location.lng;
          console.log("SCHOOL", schoolLat, schoolLong);

          var homeOptions = {
            uri: 'https://maps.googleapis.com/maps/api/geocode/json',
            qs: {
              key: 'AIzaSyDdlNYvhqPXvCEOClkJe2vPZCnPBnmFfXw',
              address: req.body.homeAddress
            },
            headers: {
              'User-Agent': 'Request-Promise'
            },
            json: true // Automatically parses the JSON string in the response
          };

          rp(homeOptions)
            .then(function(homeAddress) {
              homeLat = homeAddress.results[0].geometry.location.lat;
              homeLong = homeAddress.results[0].geometry.location.lng;
              console.log("HOME", homeLat, homeLong);
              var student = new Student({
                userId: mongoose.Types.ObjectId(user._id.toString()),
                phone: req.body.phone,
                schoolName: req.body.schoolName,
                photo: req.body.photo,
                name: req.body.name,
                email: req.body.email,
                homeLong: homeLong,
                homeLat: homeLat,
                schoolLong: schoolLong,
                schoolLat: schoolLat,
                waitingForRide: false
              });

              student.save(function(err) {
                if (err) {
                  console.log("ERROR", err);
                }
                else {
                  req.session.user = user;
                  res.redirect('/dashboard');
                }
              });
            }).catch(function(err) {
              console.log("ERROR CALLING GOOGLE (HOME)", err.message);
            });
        }).catch(function(err) {
          console.log("ERROR CALLING GOOGLE (SCHOOL)", err.message);
        });
    }
  });
});

// TODO: Nice error messages
// Post for Login Page
router.post('/login', function(req, res, next) {
  console.log("Username", req.body.username);
  User.findOne({
    username: req.body.username
  }, function(err, user) {
    if (err) {
      res.redirect('/');
    }
    else if (!user || user.password != req.body.password) {
      console.log("incorrect or nonexistent credentials with username " + req.body.username);
      res.redirect("/?error=" + encodeURIComponent("true"));
    }
    else {
      req.session.user = user;
      res.redirect('/dashboard');
    }
  });
});

// Responds to thanksForAskingRide.ejs AJAX requests, every 2 seconds until driver is found. 
router.get('/rideFound/:studentId', function(req, res, next) {
  console.log("FINDING ROUTE USING PARAM", req.params.studentId);
  TripRoute.findOne({
    studentId: req.params.studentId
  }, function(err, tripRoute) {
    console.log("Trip Route", tripRoute);
    if (err) {
      console.log("ERROR", err);
      res.json({
        found: false
      });
    }
    else {
      if (!tripRoute) {
        res.json({
          found: false
        });
      }
      else {
        res.json({
          found: true,
          tripId: tripRoute.tripId
        });
      }
    }
  });
});

// Ride Details route, shows parent and ride details. Called from thanksForAskingRide.ejs every 2 seconds.
router.get('/rideDetails/:tripId', function(req, res, next) {
  console.log("TRIP ID IN RIDE DETAILS", req.params.tripId);
  Trip.findById(mongoose.Types.ObjectId(req.params.tripId.toString()), function(err, trip) {
    if (err) {
      console.log("ERROR", err);
    }
    else {
      Parent.findById(trip.parentId, function(err, parent) {
        if (err) {
          console.log("ERROR", err);
        }
        else {
          TripRoute.findOne({
            tripId: mongoose.Types.ObjectId(req.params.tripId.toString()),
            studentId: req.session.student._id
          }, function(err, tripRoute) {
            if (err) {
              console.log("ERROR", err);
            }
            else {
              console.log("TRIP ROUTE ID IN RIDE DETAILS", tripRoute._id);
              console.log("PARENT IMAGE URL PLS", parent.carPhoto);
              res.render('rideDetails', {
                parent: parent,
                trip: trip,
                tripRoute: tripRoute,
                student: req.session.student
              });
            }
          });
        }
      });
    }
  });
});

// Sorts students by stop order, 
router.get('/studentTripDetails/:tripId', function(req, res, next) {
  console.log('TRIP ID', req.params.tripId);
  TripRoute.find({
    tripId: req.params.tripId,
    isDone: false
  }, null, {
    sort: {
      stopOrder: -1
    }
  }, function(err, tripRoutes) {
    if (err) {
      console.log("ERROR", err);
    }
    else {
      var studentIds = [];
      for (var i = 0; i < tripRoutes.length; i++) {
        studentIds.push(tripRoutes[i].studentId);
      }
      Student.find({
        _id: {
          "$in": studentIds
        }
      }, function(err, students) {
        if (err) {
          console.log("ERROR", err);
        }
        else {
          var studentTripRouteArray = tripRoutes.map(function(tripRoute) {
            var student = _.find(students, {
              _id: tripRoute.studentId
            });
            return {
              tripRoute: tripRoute,
              student: student
            };
          });

          res.render('studentTripDetails', {
            studentTripRouteArray: studentTripRouteArray,
            parentId: mongoose.Types.ObjectId(req.session.parent._id.toString())
          });
        }
      });
    }
  });
});

// Pinged by thanksForAvailable.ejs every 2 seconds. 
router.get('/studentFound/:parentId', function(req, res, next) {
  console.log("parentId", req.params.parentId);
  Trip.findOne({
    isDone: false,
    parentId: mongoose.Types.ObjectId(req.params.parentId.toString())
  }, function(err, trip) {
    if (err || !trip) {
      console.log("ERROR", err);
      console.log("FUCKFUCKUFKC", trip);
      res.json({
        found: false
      });
    }
    else {
      console.log("TRIP ID IN STUDENT FOUND", trip._id);
      TripRoute.find({
          tripId: mongoose.Types.ObjectId(trip._id.toString()),
          isDone: false
        }, null, {
          sort: {
            stopOrder: "desc"
          }
        },
        function(err, tripRoutes) {
          if (err) {
            console.log("ERROR", err);
            res.json({
              found: false
            });
          }
          else {
            if (tripRoutes && tripRoutes.length > 0) {
              var lastRoute = tripRoutes.filter(function(tripRoute) {
                return tripRoute.stopOrder == tripRoutes.length;
              });
              res.json({
                found: true,
                tripRouteId: lastRoute[0]._id,
                tripId: trip._id,
                totalKids: tripRoutes.length
              });
            }
            else {
              res.json({
                found: false
              });
            }
          }
        });
    }
  });
});

//Main dashboard routing, determines either going to student dashboard or parent dashboard. 
router.get('/dashboard', function(req, res, next) {
  if (!req.session.user) {
    res.redirect("/?error=" + encodeURIComponent("true"));
  }
  var user = req.session.user;
  if (user.type == "Parent") {
    console.log("FOUND LOGIN AS PARENT. HERE IS USERID:", user._id);
    Parent.findOne({
      userId: user._id
    }, function(err, parent) {
      if (err) {
        console.log(err);
      }
      else {
        if (parent == null) {
          console.log("ERROR, PARENT NOT FOUND");
        }
        req.session.parent = parent;
        console.log("PARENT", parent);
        report.parentRating(mongoose.Types.ObjectId(req.session.parent._id.toString()), function(err, trs) {
          var avg = null;
          console.log("etc", trs);
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

            console.log("rating", avg);
          }
          res.render('dashboard-p', {
            user: user,
            parent: parent,
            rating: avg
          });
        });
      }
    });
  }
  else {
    console.log("user id", user._id);
    Student.findOne({
      userId: mongoose.Types.ObjectId(user._id.toString())
    }, function(err, student) {
      if (err) {
        console.log(err);
      }
      else {
        if (student == null) {
          console.log("ERROR, STUDENT NOT FOUND");
          req.session.user = null;
          req.session.parent = null;
          req.session.student = null;
          res.redirect("/?error=" + encodeURIComponent("true"));
        }
        else {
          console.log("STUDENT", student);
          req.session.student = student;
          req.session.homeLong = student.homeLong;
          req.session.homeLat = student.homeLat;
          req.session.schoolLong = student.schoolLong;
          req.session.schoolLat = student.schoolLat;

          report.studentRating(mongoose.Types.ObjectId(req.session.student._id.toString()), function(err, trs) {
            var avg = null;
            var acc = [];
            console.log("etc", trs);
            if (err) {
              console.log("panic", err);
            }
            else {
              for (var i = 0; i < trs.length; i++) {
                console.log("trs", trs);
                acc[i] = trs[i].studentRating;
              }
              
              console.log("etc", acc);
              
              var sum = acc.reduce(function(a, b) {
                return a + b;
              }, 0);
              
              avg = sum / (acc.length <= 0 ? 1 : acc.length);

              console.log("rating", avg);
            
              report.recentRides(req, res, next, function (err, objs) {
                if (err) {
                  console.log("err", err);
                } else {
                  console.log("test", objs[0]);
                  res.render('dashboard-s', {
                    user: user,
                    student: student,
                    rating: avg,
                    recent: objs
                  });
                }
              });
            }
          });
        }
      }
    });
  }
});

// router.get('/test/addStudentRoutes/:studentId1/:studentId2/:parentId', function(req, res, next) {
//   var trip = new Trip({
//     tripDate: new Date(),
//     parentId: mongoose.Types.ObjectId(req.params.parentId.toString()),
//     isDone: false
//   });
//   trip.save(function(err, updatedTrip) {
//     if (err) {
//       console.log("ERROR", err);
//     }
//     else {
//       var tripRoute1 = new TripRoute({
//         tripId: updatedTrip._id,
//         studentId: mongoose.Types.ObjectId(req.params.studentId1.toString()),
//         stopOrder: 1,
//         destination: "Home",
//         longitude: -122.0298666,
//         latitude: 37.5786553,
//         isDone: false
//       });
// 
//       var tripRoute2 = new TripRoute({
//         tripId: updatedTrip._id,
//         studentId: mongoose.Types.ObjectId(req.params.studentId2.toString()),
//         stopOrder: 2,
//         destination: "Home",
//         longitude: -122.0298666,
//         latitude: 37.5786553,
//         isDone: false
//       });
// 
//       tripRoute1.save(function(err) {
//         if (err) {
//           console.log("ERROR", err);
//         }
//         else {
//           tripRoute2.save(function(err) {
//             if (err) {
//               console.log("ERROR", err);
//             }
//             else {
//               res.json({
//                 tripRoute1: tripRoute1,
//                 tripRoute2: tripRoute2,
//                 trip: updatedTrip
//               });
//             }
//           });
//         }
//       });
//     }
//   });
// 
// });

router.get('/report', report.report);

router.get('/logout', function(req, res, next) {
  req.session.user = null;
  req.session.parent = null;
  req.session.student = null;
  res.redirect('/');
});

router.get('/rateStudent/:tripRouteId/:destination', function(req, res, next) {
  TripRoute.findById(req.params.tripRouteId, function(err, tripRoute) {
    if (err) {
      console.log("ERROR", err);
    }
    else {
      var studentId = tripRoute.studentId;
      Student.findById(studentId, function(err, student) {
        if (err) {
          console.log("ERROR", err);
        }
        else {
          res.render('rateStudent', {
            student: student,
            tripRoute: tripRoute
          });
        }
      });
    }
  });
});

router.post('/rateStudent', function(req, res, next) {
  function go(req, res, next, student, cb) {
    if (req.params.destination == "School") {
      var options = {
        uri: 'https://maps.googleapis.com/maps/api/distancematrix/json',
        qs: {
          key: 'AIzaSyAq3xxXpjgkz8RMNBApv1I4DSt2BMwpSWk',
          units: "imperial",
          origins: student.homeLat + "," + student.homeLong,
          destinations: student.schoolLat + "," + student.schoolLong
        },
        headers: {
          'User-Agent': 'Request-Promise'
        },
        json: true // Automatically parses the JSON string in the response
      };
    }
    else {
      var options = {
        uri: 'https://maps.googleapis.com/maps/api/distancematrix/json',
        qs: {
          key: 'AIzaSyAq3xxXpjgkz8RMNBApv1I4DSt2BMwpSWk',
          units: "imperial",
          origins: student.schoolLat + "," + student.schoolLong,
          destinations: student.homeLat + "," + student.homeLong
        },
        headers: {
          'User-Agent': 'Request-Promise'
        },
        json: true // Automatically parses the JSON string in the response
      };
    }
    rp(options)
      .then(function(matrix) {
        console.log("UPDATING TRIP ROUTE ID", req.params.tripRouteId);
        var distance = metersToMiles(matrix.rows[0].elements[0].distance.value);
        TripRoute.update({
          _id: mongoose.Types.ObjectId(req.params.tripRouteId)
        }, {
          $set: { distance: distance, isDone: true }
        }, function(err) {
          if (err) {
            console.log("ERROR", err);
          }
          else {
            student.miles += distance;
            student.save(function(err, updatedStudent) {
              if (err) {
                console.log("ERROR", err);
              }
              else {
                var parent = req.session.parent;
                console.log("PARENT MILES", req.session.parent.miles);
                var totalMiles = parent.miles + distance;
                Parent.update({_id: parent._id}, {miles: totalMiles}, function(err){
                  if (err) {
                    console.log("ERROR", err);
                  }
                  else {
                    cb();
                  }
                });
              }
            });
          }
        });
      })
      .catch(function(err) {
        console.log("ERROR", err);
      });
  }
  TripRoute.findById(req.body.tripRouteId, function(err, tripRoute) {
    if (err) {
      console.log("ERROR1", err);
    }
    else {
      TripRoute.update({_id: req.body.tripRouteId}, {isDone: true, studentRating: req.body.star }, function(err) {
        if (err) {
          console.log("ERROR2", err);
        }
        else {
          TripRoute.count({tripId: tripRoute.tripId, isDone: false}, function(err, count) {
            if (err) {
              console.log("ERROR3", err);
            }
            else {
              if (count == 0) {
                Trip.update({
                  _id: tripRoute.tripId
                }, {isDone: true}, function(err, trip) {
                  if (err) {
                    console.log("ERROR", err);
                  }
                  else {
                    Student.findById(mongoose.Types.ObjectId(req.body.studentId.toString()), function(err, student) {
                      if (err) {
                        console.log("err", err);
                        res.redirect('/');
                      } else {
                        go(req, res, next, student, function() {
                          res.redirect('/');
                        });
                      }
                    });
                  }
                });
              }
              else {
                Student.findById(mongoose.Types.ObjectId(req.body.studentId.toString()), function(err, student) {
                  if (err) {
                    console.log("err", err);
                    console.log("TRIP ROUTE", tripRoute);
                    res.redirect('/studentTripDetails/' + tripRoute.tripId);
                    res.redirect('/');
                  } else {
                    go(req, res, next, student, function() {
                      res.redirect('/');
                      console.log("TRIP ROUTE", tripRoute);
                      res.redirect('/studentTripDetails/' + tripRoute.tripId);
                    });
                  }
                });
              }
            }
          });
        }
      });
    }
  });
});

router.get('/rateParent/:tripId/:tripRouteId', function(req, res, next) {
  console.log("TRIP ID IN RP", req.params.tripId);
  console.log("TRIP ROUTE ID IN RP", req.params.tripRouteId);
  TripRoute.update({_id: req.params.tripRouteId}, {isDone: true}, function(err){
    if(err){
      console.log("ERROR", err);
    } else {
      TripRoute.count({tripId: req.params.tripId, isDone: false}, function(err, count){
        if(err){
          console.log("ERROR", err);
        } else {
          var tripDistance = 0;
          if(count == 0){
            TripRoute.find({tripId: req.params.tripId}, function(err, tripRoutes) {
              if(err){
                console.log("ERROR", err);
              } else {
                for(var i = 0; i < tripDistance.length; i++) {
                  tripDistance += tripRoutes[i].miles;
                }
              }
              Trip.findByIdAndUpdate(mongoose.Types.ObjectId(req.params.tripId.toString()), {isDone: true, totalDistance: tripDistance}, function (err, trip) {
                if(err){
                  console.log("ERROR", err);
                } else {
                  res.render('rateParent', {trip: trip, tripRouteId: req.params.tripRouteId});
                }
              });
            });
          } else {
            res.render('rateParent', {tripRouteId: req.params.tripRouteId});
          }
        }
      });
    }
  });    
});

router.post('/rateParent', function(req, res, next) {
   TripRoute.update({_id: req.body.tripRouteId}, {parentRating: req.body.star}, function(err){
     if(err){
       console.log("ERROR", err);
     } else {
       res.redirect('/dashboard');
     }
   }); 
});

router.get('/rankings', function (req, res, next) {
  console.log("rankings!");
  report.parentRankingHandler(function (pres) {
    console.log("pres", pres);
    report.studentRankingHandler(function (sres) {
      res.render('rankings', {
        pres: pres,
        sres: sres
      });
    })(req, res, next);
  })(req, res, next);
});

router.get('/redeemMiles/:pid', function (req, res, next) {
  
  function go(arr, index, cb) {
    if (index < arr.length) {
      var sid = mongoose.Types.ObjectId(arr[index]._id)
      Student.update({ _id: sid }, { miles: 0 }, {}, function (err, raw) {
        if (err) {
          cb(err)
        } else {
          go(arr, index + 1, cb);
        }
      });
    } else {
      cb();
    }
  }
  
  console.log("Redeeming miles");
  var pid = req.params.pid;
  Student.find({}).exec(function (err, students) {
    if (err) {
      console.log("err", err);
    } else {
      students.filter(function (x) {
        x.motherId === mongoose.Types.ObjectId(pid) || x.fatherId === mongoose.Types.ObjectId(pid);
      });
      
      var t = 0
      for (var i = 0; i < students.length; i++) {
        t += students[i].miles
      }
      
      go(students, 0, function(err) {
        if (err) {
          console.log("err", err);
        } else {
          Parent.findOne({ _id: mongoose.Types.ObjectId(pid) }, function(err, parent) {
            if (err || !parent) {
              console.log("err || !parent");
            } else {
              Parent.update({ _id: mongoose.Types.ObjectId(pid) }, { miles: parent.miles - t }, {}, function(err, raw) {
                res.redirect("/report");
              })
            }
          })
        }
      });
    }
  });
});

function metersToMiles(i) {
  return i * 0.000621371192;
}

module.exports = router;
