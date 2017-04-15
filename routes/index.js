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
    _id: req.session.parent._id,
    latitude: req.param("lat"),
    longitude: req.param("long")
  }, {
    $set: {
      available: true
    }
  }, function() {
    console.log("EMITTING FIND STUDENT parent id=", req.session.parent._id);
    req.app.emit('event:findStudent', {
      parent: req.session.parent
    });
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
  Student.update({
    _id: req.session.student._id
  }, {
    $set: {
      waitingForRide: true
    }
  }, function() {
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
      return ("ERROR IN USER", err);
    }
    else {
      req.session.user = user;
      var parent = new Parent({
        userId: mongoose.Types.ObjectId(user._id.toString()),
        phone: req.body.phone,
        carImage: req.body.carImage,
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
  console.log("FINDING ROUTE USING PARAM", req.param.studentId);
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
  Trip.findById(req.params.tripId, function(err, trip) {
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
            tripId: req.params.tripId,
            studentId: req.session.student._id
          }, function(err, tripRoute) {
            if (err) {
              console.log("ERROR", err);
            }
            else {
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
    tripId: req.params.tripId
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
            parentId: req.session.parent._id
          });
        }
      });
    }
  });
});

// Pinged by thanksForAvailable.ejs every 2 seconds. 
router.get('/studentFound/:parentId', function(req, res, next) {
  Trip.findOne({
    isDone: false,
    parentId: req.params.parentId
  }, function(err, trip) {
    if (err) {
      console.log("ERROR", err);
    }
    else {
      TripRoute.find({
          tripId: trip._id,
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
            console.log("etc", trs);
            if (err) {
              console.log("panic", err);
            }
            else {
              for (var i = 0; i < trs.length; i++) {
                trs[i] = trs[i].parentId;
              }
              console.log("etc", trs);
              var sum = trs.reduce(function(a, b) {
                return a + b;
              }, 0);
              avg = sum / (trs.length <= 0 ? 1 : trs.length);

              console.log("rating", avg);
            }
            res.render('dashboard-s', {
              user: user,
              student: student,
              rating: avg
            });
          });
        }
      }
    });
  }
});

router.get('/test/addStudentRoutes', function(req, res, next) {
  var trip = new Trip({
    tripDate: new Date(),
    parentId: mongoose.Types.ObjectId("58f0ff1ce2d1ed1658e166bd"),
    isDone: false
  });
  trip.save(function(err, updatedTrip) {
    if (err) {
      console.log("ERROR", err);
    }
    else {
      var tripRoute1 = new TripRoute({
        tripId: updatedTrip._id,
        studentId: mongoose.Types.ObjectId("58e46b8f8fb8ec0ec12a0d06"),
        stopOrder: 1,
        destination: "Home",
        longitude: -122.0298666,
        latitude: 37.5786553,
        isDone: false
      });

      var tripRoute2 = new TripRoute({
        tripId: updatedTrip._id,
        studentId: mongoose.Types.ObjectId("58f14ce637aadc1d917cc36f"),
        stopOrder: 2,
        destination: "Home",
        longitude: -122.0298666,
        latitude: 37.5786553,
        isDone: false
      });

      tripRoute1.save(function(err) {
        if (err) {
          console.log("ERROR", err);
        }
        else {
          tripRoute2.save(function(err) {
            if (err) {
              console.log("ERROR", err);
            }
            else {
              res.json({
                tripRoute1: tripRoute1,
                tripRoute2: tripRoute2,
                trip: updatedTrip
              });
            }
          });
        }
      });
    }
  });

});

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
              var distance = matrix.rows[0].elements[0].distance.value;
              console.log("DISTANCE", distance);
              tripRoute.totalDistance = distance;
              TripRoute.save({_id: req.params.tripRouteId}, function(err, updatedTripRoute) {
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
                      var totalMiles = parent.miles + distance;
                      Parent.update({_id: parent._id}, {miles: totalMiles}, function(err){
                        if (err) {
                          console.log("ERROR", err);
                        }
                        else {
                          res.render('rateStudent', {
                            student: student,
                            tripRoute: updatedTripRoute
                          });
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
      });
    }
  });
});

router.post('/rateStudent', function(req, res, next) {
  TripRoute.findById(req.body.tripRouteId, function(err, tripRoute) {
    if (err) {
      console.log("ERROR", err);
    }
    else {
      TripRoute.update({_id: tripRoute._id}, {isDone: false, studentRating: req.body.star }, function(err) {
        if (err) {
          console.log("ERROR", err);
        }
        else {
          TripRoute.count({tripId: tripRoute.tripId, isDone: false}, function(err, count) {
            if (err) {
              console.log("ERROR", err);
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
                    res.redirect('/');
                  }
                });
              }
              else {
                console.log("TRIP ROUTE", tripRoute);
                res.redirect('/studentTripDetails/' + tripRoute.tripId);
              }
            }
          });
        }
      });
    }
  });
});

router.get('/rateParent/:tripId/:tripRouteId', function(req, res, next) {
      
});

router.get('/rankings', function (req, res, next) {
  console.log("rankings!");
  report.parentRankingHandler(function (pres) {
    console.log("done with parents");
    report.studentRankingHandler(function (sres) {
      console.log("done with students");
      res.render('rankings', {
        pres: pres,
        sres: sres
      });
    });
  });
});


module.exports = router;
