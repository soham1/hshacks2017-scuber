var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var User = require("../models/user.js");
var Parent = require("../models/parent.js");
var Student = require("../models/student.js");

// TODO: this isn't really required, either because you could move the file contents of pushpad here, or because you could just insert the link in the template manually
var pushpad = require("../dumpster/pushpad.js");

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log(req.isMobile);
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

router.post('/register', function(req, res, next) {
  console.log("Inside register post");
  var user = new User({ 
    username: req.body.username,
    password: req.body.password,
    type: "Student"
  });
  user.save(function (err) {
    if (err){
      return ("ERROR IN USER", err);
    }else{
      console.log("inside saving student");
      var student = new Student({
        phone: req.body.phone,
        schoolId: req.body.schoolId,
        name: req.body.name,
        email: req.body.email
      });
      
      student.save(function (err) {
        if (err){
          console.log("ERROR", err);
        }else{
          res.render('dashboard-s', {user: user, student: student, project: pushpad.project});
        }
      });
    } 
  });
});

// TODO: Nice error messages
router.post('/login', function(req, res, next) {
  console.log(req.body.username);
  User.findOne({
    username: req.body.username
  }, function(err, user) {
    if (err) {
      res.redirect('/');
    } else if (!user || user.password != req.body.password) {
      console.log("incorrect or nonexistent credentials with username " + req.body.username);
      res.redirect("/?error=" + encodeURIComponent("true"));
    } else {
      req.session.user = user;
      if (user.type == "Parent") {
        Parent.findOne({
          userId: user._id
        }, function(err, parent) {
          if (err) {
            console.log(err);
          }
          else {
            req.session.parent = parent;
            res.render('dashboard-p', {
              user: user,
              parent: parent,
              project: pushpad.project
            });
          }
        });
      }
      else {
        Student.findOne({
          userId: user._id
        }, function(err, student) {
          if (err) {
            console.log(err);
          }
          else {
            req.session.student = student;
            res.render('dashboard-s', {
              user: user,
              student: student,
              project: pushpad.project
            });
          }
        });
      }
    }
  });
});

module.exports = router;
