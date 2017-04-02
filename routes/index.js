var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var User = require("../models/user.js");
var Parent = require("../models/parent.js");
var Student = require("../models/student.js");

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

router.get('/register', function(req, res, next) {
  res.render('register.ejs');
});

router.get('/register-parent', function(req, res, next) {
  res.render('register-parent.ejs');
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
          res.redirect('/dashboard-s');
        }
      });
    }
  });
});

// Students can only register parents in the dashboard*
router.post('/register', function(req, res, next) {
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
      var student = new Student({
        userId: mongoose.Types.ObjectId(user._id.toString()),
        phone: req.body.phone,
        schoolName: req.body.schoolName,
        photo: req.body.photo,
        name: req.body.name,
        email: req.body.email
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
    }
  });
});

// TODO: Nice error messages
router.post('/login', function(req, res, next) {
  console.log("Username", req.body.username);
  User.findOne({
    username: req.body.username
  }, function(err, user) {
    console.log("given pw: " + req.body.password);
    console.log("actual pw: " + user.password);
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
