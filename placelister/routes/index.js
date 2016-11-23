var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;

var mongoose = require('mongoose');
var List = mongoose.model('List');
var Place = mongoose.model('Place');

router.get('/lists', function(req, res, next) {
  List.find(function(err, lists){
    if(err){ return next(err); }

    res.json(lists);
  });
});

router.post('/lists', function(req, res, next) {
  var list = new List(req.body);

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

router.param('place', function(req, res, next, id) {
  var query = Place.findById(id);

  query.exec(function (err, place){
    if (err) { return next(err); }
    if (!place) { return next(new Error("can't find place")); }

    req.place = place;
    return next();
  });
});


router.get('/lists/:list', function(req, res) {
  req.list.populate('places', function(err, list) {
    res.json(list);
  });

});


router.put('/lists/:list/upvote', function(req, res, next) {
  req.list.upvote(function(err, list){
    if (err) { return next(err); }

    res.json(list);
  });
});


router.post('/lists/:list/places', function(req, res, next) {
  var place = new Place(req.body);
  place.list = req.list;

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

router.delete('/lists/:list/places/:place', function(req, res, next) {
  var place = req.place;


  place.save(function(err, place){
    if(err){
        return next(err);
    }
    var placeloc = req.list.places.indexOf(place);
    req.list.places.splice(placeloc,1);
    req.list.save(function(err, list) {
      if(err){ return next(err); }
      res.json(place);
    });
  });
});
