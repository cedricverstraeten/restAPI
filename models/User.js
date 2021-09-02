//var db = require("../database/mongo");
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
 
var UserSchema = new Schema({
    Name: String,
    Password: String,
    Mail: String,
    BorrowedItems : [],
    admin: Boolean,
    isDeleted: Boolean
});

 
module.exports = mongoose.model('Users', UserSchema);