//var db = require("../database/mongo");
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
 
var MaterialSchema = new Schema({
    name: String,
    type: String,
    createdBy: String,
    isBorrowed: Boolean,
    isDeleted: Boolean
});
 
module.exports = mongoose.model('Materials', MaterialSchema);