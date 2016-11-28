/**
 * Created by kevindenny on 11/17/16.
 */

var mongoose = require('mongoose');

var PlaceSchema = new mongoose.Schema({
  name: String,
  realName: String,
  type: String,
  url: String,
  address: String,
  city: String,
  state: String,
  lat : Number,
  lon : Number,
  list: { type: mongoose.Schema.Types.ObjectId, ref: 'List' }
});



mongoose.model('Place', PlaceSchema);