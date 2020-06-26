/***
 *  Query Server
 */

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Query' });
});

/* POST Query Request */


module.exports = router;
