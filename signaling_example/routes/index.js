var express = require('express.io');
var router = express.Router();
var _ = require('underscore');

/* GET home page. */
module.exports = function(req, res) {
	if(process.env.NODE_ENV === 'development'){
		res.render('development', {title: 'SPEEZ - DEV'});
	} else {
		res.render('index', {title: 'SPEEZ - ARE YOU FAZT ENOUGH'});
	}
};

module.exports.partials = function(req, res){
  var name = req.params.name;
  if(!name) return;  // might want to change this
  res.render("partials/" + name );
};
