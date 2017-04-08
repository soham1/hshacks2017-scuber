var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var User = require("../models/user.js");
var Parent = require("../models/parent.js");
var Student = require("../models/student.js");
var rp = require('request-promise');

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
  return deg * (Math.PI / 180)
}

// TODO: this isn't really required, either because you could move the file contents of pushpad here, or because you could just insert the link in the template manually
var pushpad = require("../dumpster/pushpad.js");

/* GET home page. */
// TODO: Redirect to dashboard if logged in (implement after logging out is implemented)
router.get('/', function(req, res, next) {
  console.log("isMobile", req.isMobile);
  var error = req.query.error;
  console.log(error);
  if (req.isMobile) {
    res.render('index-m');
  }
  else {
    res.render('index');
  }
});

router.get('/available', function(req, res, next) {
    
});

router.get('/register', function(req, res, next) {
  res.render('register.ejs');
});

router.get('/register-parent', function(req, res, next) {
  res.render('register-parent.ejs');
});

router.post('/confirmRide', function(req, res, next) {
  var currToSchool = getDistanceFromLatLonInKm(req.body.currLat, req.body.currLong, req.session.schoolLat, req.session.schoolLong);
  var currToHome = getDistanceFromLatLonInKm(req.body.currLat, req.body.currLong, req.session.homeLat, req.session.homeLong);
  var destination = "School";
  if(currToSchool > currToHome) {
    destination = "Home";
  } 
  console.log("DESTINATION", destination);
  res.render('confirmRide.ejs', {destination: destination, student: req.session.student});
});

router.post('/updateDestination', function(req, res, next) {
 //TODO: Logic for updating destination. Impact: Minor  
});

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
      var parent = new Parent({
        userId: mongoose.Types.ObjectId(user._id.toString()),
        phone: req.body.phone,
        carImage: req.body.carImage,
        carMakeModel: req.body.carMakeModel,
        licensePlate: req.body.licensePlate,
        photo: req.body.photo,
        name: req.body.name,
        email: req.body.email
      });

      parent.save(function(err) {
        if (err) {
          return ("ERROR", err);
        }
        else {
          req.session.parent = parent;
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
                schoolLat: schoolLat
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

// TODO: Logging out 
router.get('/dashboard', function(req, res, next) {
  if (!req.session.user) {
    res.redirect("/?error=" + encodeURIComponent("true"));
  }
  var user = req.session.user;
  if (user.type == "Parent") {
    Parent.findOne({
      userId: mongoose.Types.ObjectId(user._id.toString())
    }, function(err, parent) {
      if (err) {
        console.log(err);
      }
      else {
        req.session.parent = parent;
        res.render('dashboard-p', {
          user: user,
          parent: parent,
          path: pushpad.project.pathFor(user._id.toString())
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
        console.log("STUDENT", student);
        req.session.student = student;
        req.session.homeLong = student.homeLong;
        req.session.homeLat = student.homeLat;
        req.session.schoolLong = student.schoolLong;
        req.session.schoolLat = student.schoolLat;

        res.render('dashboard-s', {
          user: user,
          student: student,
          path: pushpad.project.pathFor(user._id.toString())
        });
      }
    });
  }
});

module.exports = router;
