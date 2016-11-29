var express = require('express');
var router = express.Router();
var passport = require('passport');
var jwt = require('express-jwt');


var mongoose = require('mongoose');
var List = mongoose.model('List');
var Place = mongoose.model('Place');
var User = mongoose.model('User');

var auth = jwt({secret: 'SECRET', userProperty: 'payload'});



/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


// List Methods

router.get('/lists', function(req, res, next) {
  List.find(function(err, lists){
    if(err){ return next(err); }

    res.json(lists);
  });
});

router.post('/lists', auth, function(req, res, next) {
  var list = new List(req.body);
  list.author = req.payload.username;
  console.log(list)
  list.save(function(err, list){
    if(err){ return next(err); }

    res.json(list);
  });
});


router.param('list', function(req, res, next, id) {
  var query = List.findById(id);

  query.exec(function (err, list){
    if (err) { return next(err); }
    if (!list) return next(new Error('can\'t find list'));

    req.list = list;
    return next();
  });
});

router.get('/dashboard', auth, function(req, res) {
    var user = req.payload.username;

    List.find({author : user}, function(err, lists){
    if(err){ return next(err); }

    res.json(lists);
  });

});




router.get('/lists/:list', function(req, res) {
  req.list.populate('places', function(err, list) {

    res.json(list);
  });

});


router.put('/lists/:list/upvote', auth, function(req, res, next) {
  req.list.upvote(function(err, list){
    if (err) { return next(err); }

    res.json(list);
  });
});



// Place methods

router.param('place', function(req, res, next, id) {
  var query = Place.findById(id);

  query.exec(function (err, place){
    if (err) { return next(err); }
    if (!place) { return next(new Error("can't find place")); }

    req.place = place;
    return next();
  });
});


router.post('/lists/:list/places', auth, function(req, res, next) {
  var place = new Place(req.body);
  place.list = req.list;
  place.added_by = req.payload.username;

  place.save(function(err, place){
    if(err){
        return next(err);
    }

    req.list.places.push(place);
    req.list.save(function(err, list) {
      if(err){ return next(err); }

      res.json(place);
    });
  });
});

router.delete('/lists/:list/places/:place', auth, function(req, res, next) {
  var place = req.place;


  place.save(function(err, place){
    if(err){
        return next(err);
    }
    var placeloc = req.list.places.indexOf(place._id);
    var oldlist = req.list;
    req.list.places.splice(placeloc,1)[0];

    req.list.save(function(err, list) {
      if(err){ return next(err); }
      res.json(placeloc);
    });
  });
});


// User methods


router.post('/register', function(req, res, next){
  if(!req.body.username || !req.body.password){
    return res.status(400).json({message: 'Please fill out all fields'});
  }

  var user = new User();

  user.username = req.body.username;

  user.setPassword(req.body.password)

  user.save(function (err){
    if(err){ return next(err); }

    return res.json({token: user.generateJWT()})
  });
});


router.post('/login', function(req, res, next){
  if(!req.body.username || !req.body.password){
    return res.status(400).json({message: 'Please fill out all fields'});
  }

console.log('calling passport)');
  passport.authenticate('local', function(err, user, info){
    if(err){ return next(err); }

    if(user){
      return res.json({token: user.generateJWT()});
    } else {
      return res.status(401).json(info);
    }
  })(req, res, next);
});

module.exports = router;
