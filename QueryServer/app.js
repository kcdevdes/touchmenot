var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');

var lostUserDetector = require('./lostUserDetector');
var deadUserDetector = require('./deadUserDetector');

var app = express();

// view engine setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/*** 실질적으로 구동되는 타이머입니다. */
// lostUser 탐지기입니다.
setInterval(function() {
  lostUserDetector();
}, 2000);

//deadUser 탐지기입니다.
setInterval(function() {
  deadUserDetector();
}, 2000);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
