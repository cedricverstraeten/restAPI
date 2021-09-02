const express = require('express');
const router = express.Router();
//const mongoose = require('mongoose');
const jwt = require('jsonwebtoken')

const db = require('../database/mongo');
const { ObjectId } = require('mongodb');
//const { get } = require('https');

const Material = require('../models/Material')


// Get all items of a given collection
app.get('/:collection', isAuthorized, async (req,res)=>{

    //Get collection name
    const collection = req.params.collection

    //retrieve data
    await db.getDB()
        .collection(collection)
        .find({})
        .toArray((err,collection)=>{
            if(err)
                console.log(err);
            else{
                res
                    .type('application/json')
                    .json(collection);
            }
        });
});

// Get item by ID of a given collection 
app.get('/:collection/:id', isAuthorized, async (req,res)=>{
    //Get collection name
    const collection = req.params.collection
    const itemID = ObjectId(req.params.id)

    //get item of collection
    await db.getDB()
        .collection(collection)
        .find({_id:itemID})
        .toArray((err,item)=>{
            if(err)
                console.log(err);
            else{
                res
                    .type('application/json')
                    .json(item);
            }
        });
});

//Set options voor collections
app.options('/:collection', isAuthorized, (req, res)=> {
    res
        .header('Allow','OPTIONS, GET')
        .end()
});



//Set options voor items in collections
app.options('/:collection/:id', isAuthorized, (req, res)=> {
    res
        .header('Allow','OPTIONS, GET')
        .end()
});

app.get('/', (req, res) => res.send("Server is running"))

app.get('/secret', isAuthorized, (req, res) => {
    res.json({"message": "Super Secret Message"});
})


app.get('/jwt', (req, res) =>{
    let privateKey = fs.readFileSync('./private.pem', 'utf8');
    let token = jwt.sign({"body":"stuff"}, privateKey, {algorithm: 'HS256'});
    res.send(token);

})


function isAuthorized(req, res, next){
    if (typeof req.headers.authorization !== "undefined") {

        let token = req.headers.authorization.split(" ")[1];
        let privateKey = fs.readFileSync('./private.pem', 'utf8');

        jwt.verify(token, privateKey, { algorithm: "HS256"}, (err, decoded) => {
            if (err){
                res
                    .status(500)
                    .json({ error : "Not Authorized"})
            }
            //console.log(decoded);

            return next();
        })
    } else {
        res
            .status(500)
            .json({ error: "Not Authorized"})
        //res.redirect('/login')
    }
}


db.connect((err)=>{
    // If err unable to connect to database
    // End application
    if(err){
        console.log('unable to connect to database');
        process.exit(1);
    }
    // Successfully connected to database
    // Start up our Express Application
    // And listen for Request
    else{
        app.listen(port, () => console.log(`Connected to database. Started App on port: ${port}`))
    }
});