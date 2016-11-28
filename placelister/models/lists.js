/**
 * Created by kevindenny on 11/17/16.
 */

var mongoose = require('mongoose');

var ListSchema = new mongoose.Schema({
  title: String,
  author: String,
  upvotes: {type: Number, default: 0},
  places: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Place' }]
});

ListSchema.methods.upvote = function(cb) {
  this.upvotes += 1;
  this.save(cb);
};

mongoose.model('List', ListSchema);