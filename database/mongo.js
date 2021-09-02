const MongoClient = require("mongodb").MongoClient;
const ObjectID = require('mongodb').ObjectID;
// name of our database
const dbname = "FabLab";
// location of where our mongoDB database is located
const url = "mongodb+srv://MongoUser:MongoDB493852@cluster0.jrkka.mongodb.net/FabLab?retryWrites=true&w=majority&ssl=true";
//const url = "mongodb://MongoUser:MongoDB493852@cluster0-shard-00-00.jrkka.mongodb.net:27017,cluster0-shard-00-01.jrkka.mongodb.net:27017,cluster0-shard-00-02.jrkka.mongodb.net:27017/FabLab?ssl=true&replicaSet=atlas-t294r4-shard-0&authSource=admin&retryWrites=true&w=majority";

// Options for mongoDB
const mongoOptions = {useNewUrlParser : true};

const state = {
    db : null
};

const connect = async (cb) =>{
    // if state is not NULL
    // Means we have connection already, call our CB
    if(await state.db)
        await cb();
    else{
        // attempt to get database connection
        await MongoClient.connect(url,mongoOptions,(err,client)=>{
            // unable to get database connection pass error to CB
            if(err)
               cb(err);
            // Successfully got our database connection
            // Set database connection and call CB
            else{
                state.db = client.db(dbname);
                cb();
            }
        });
    }
}

// returns OBJECTID object used to 
const getPrimaryKey = (_id)=>{
    return ObjectID(_id);
}

// returns database connection 
const getDB = ()=>{
    return state.db;
}

module.exports = {getDB,connect,getPrimaryKey};