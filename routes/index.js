var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var User = require("../models/user.js");
var Parent = require("../models/parent.js");
var Student = require("../models/student.js");
/* GET home page. */
router.get('/', function(req, res, next) {
  console.log(req.isMobile);
  if (req.isMobile) {
    res.render('index-m');
  }
  else {
    res.render('index');
  }
});

router.post('/login', function(req, res, next) {
  console.log(req.body.username);
  User.find({
    username: req.body.username
  }, function(err, user) {
    if (err) {
      res.redirect('/');
    }
    else {
      req.session.user = user;
      if (user.type == "Parent") {
        Parent.find({
          userId: user._id
        }, function(err, parent) {
          if (err) {
            console.log(err);
          }
          else {
            req.session.parent = parent;
            res.render('dashboard', {
              user: user,
              parent: parent
            });
          }
        });
      }
      else {
        Student.find({
          userId: user._id
        }, function(err, student) {
          if (err) {
            console.log(err);
          }
          else {
            req.session.student = student;
            res.render('dashboard', {
              user: user,
              student: student
            });
          }
        });
      }
    }
  });
});

module.exports = router;
