var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');
var useragent = require('useragent');
var index = require('./routes/index');
var mongoose = require('mongoose');
var matchmaker = require('./matchmaker');

mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost/uberSchool");

var app = express();

var SECRET = "This is the world's most secure secret!";

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser(SECRET));
app.use(session({
  secret: SECRET,
  saveUninitialized: false,
}))
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(__dirname + '/node_modules/'));

app.use(function(req, res, next) {
  var agent = useragent.parse(req.headers['user-agent']);
  req.agent = agent;
  req.isMobile = false;
  if(agent.family == "Chrome Mobile" || agent.family == "Mobile Safari"){
    req.isMobile = true;
  } 
  next();
});

app.on('event:requestRide', matchmaker.requestRide);
app.on('event:findStudent', matchmaker.findStudent);

app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// require('./automation.js').add();

module.exports = app;
