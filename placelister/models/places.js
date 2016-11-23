/**
 * Created by kevindenny on 11/17/16.
 */

var mongoose = require('mongoose');

var PlaceSchema = new mongoose.Schema({
  name: String,
  type: String,
  list: { type: mongoose.Schema.Types.ObjectId, ref: 'List' }
});



mongoose.model('Place', PlaceSchema);