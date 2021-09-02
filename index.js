const express = require('express')
const bodyParser = require("body-parser")
const jwt = require('jsonwebtoken')
//const bcrypt = require('bcryptjs');
const passport = require('passport');
const Joi = require('joi');
const path = require('path');
const fs = require('fs')
const app = express()
const port = 3000

const db = require('./database/mongo');
const Material = require('./models/Material')
const User = require('./models/User');
const { ObjectId } = require('mongodb');
const { get } = require('http');
const { required } = require('joi');
const { abort } = require('process');

// parses json data sent to us by the user 
app.use(bodyParser.json());
//app.use('//api', require ('./routes//api'));

//Create controlschemas
const controlSchemaMaterial = Joi.object().keys({
    name : Joi.string().required(),
    type : Joi.string().required(),
    createdBy : Joi.string().required(),
    isBorrowed : Joi.boolean().required(),
    isDeleted : Joi.boolean().required()
});
const controlSchemaUser = Joi.object().keys({
    Name : Joi.string().required(),
    Password : Joi.string().required(),
    Mail : Joi.string().required(),
    admin: Joi.boolean().required(),
    isDeleted: Joi.boolean().required()
});


//------------------------------------------
//Allow all requests from all domains & localhost
app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000"); // OOK IN /api WAARDE TOEVOEGEN
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT");
    res.header("X-Content-Type-Options", "nosniff");
    next();
  });
//--------------------------------------------------

// Get all items of a given collection
app.get('/api/:collection', async (req,res)=>{

    //if(req.header.Access-Control-Allow-Origin == null || req.header.Access-Control-Allow-Origin == undefined)
    //Get collection name
    const collection = req.params.collection

    //retrieve data
    await db.getDB()
        .collection(collection)
        .find({})
        .toArray((err,collection)=>{
            if(err){
                console.log(err);
                res
                    .status(404)
                    .end()
            } else {
                //res.status=200
                res
                    .status(200)
                    .type('application/json')
                    .json(collection);
            }
        });
});

// Get item by ID of a given collection 
app.get('/api/:collection/:id', isAuthorized, async (req,res)=>{
    //Get collection name & itemID
    const collection = req.params.collection
    const itemID = ObjectId(req.params.id)
    //const itemID = db.getPrimaryKey(req.params.id)

    //get item of collection
    await db.getDB()
        .collection(collection)
        .find({_id:itemID})
        .toArray((err,item)=>{
            if(err){
                console.log(err);
                res
                    .status(404)
                    .end()
            } else {
                res
                    .status(200)
                    .type('application/json')
                    .json(item);
            }
        });
});

//Set options voor collections
app.options('/api/:collection', isAuthorized, (req, res)=> {
    res
        .status(204)
        .header('Allow','OPTIONS, GET, POST')
        .end()
});

//Set options voor items in collections
app.options('/api/:collection/:id', isAuthorized, (req, res)=> {
    res
        .status(204)
        .header('Allow','OPTIONS, DELETE, GET, PUT')
        .end()
});

//Create new item
app.post('/api/:collection', isAuthorized, async (req, res)=>{
    //get collection name
    const collection = req.params.collection

    //Determine wich object is passed and return appropiated schema
    const schema = selectSchema(collection, req.body)

    await db
        .getDB()
        .collection(collection)
        .insertOne(schema, (err,item)=>{
            if (err) {
                console.log("[Error]: " + err)
                res
                    .status(400)
                    .json({'message': "Item could not be created."})
            } else{
                console.log(item)
                res
                    .status(201)
                    .json({"message":"Item " + schema.ObjectId + " created!"})
            }
        })
});

//Delete item
app.delete('/api/:collection/:id', isAuthorized, async (req, res) =>{
    //Get collection name & itemID
    const collection = req.params.collection
    const itemID = ObjectId(req.params.id)
    //const itemID = db.getPrimaryKey(req.params.id)

    await db
        .getDB()
        .collection(collection)
        .findOneAndUpdate({_id:itemID}, {$set : {isDeleted : true}}, {returnOriginal : false}, (err, result)=> {
            if(err){
                console.log(err);
                res
                    .status(404)
                    .end()
            } else {
                res
                    .status(204)
                    .json({"message":"Item " + itemID + " deleted!"});
            }
        })
});

//Update item
app.put('/api/:collection/:id', isAuthorized, async (req, res)=>{
    //Get collection name & itemID
    const collection = req.params.collection
    const itemID = ObjectId(req.params.id)
    //const itemID = db.getPrimaryKey(req.params.id)

    //Instead of updating the document, replace it because:
    //(1) collection at runtime is unknow, so how to update the document? 
    //(2) when creating a new schema, a new id is generated. This defeats the point of updating where the id is kept
    await db
        .getDB()
        .collection(collection)
        .replaceOne({_id:itemID}, req.body, upsert = false, (err, result)=> {
            if(err){
                console.log(err);
                res
                    .status(404)
                    .end()
            } else {
                res
                    .status(204)
                    .json({"message":"Item " + itemID + " updated!"});
            }
        })  
});

//Following reqests are not approved (status 405):
//collection: PUT, PATCH, DELETE
app.put('/api/:collection', async (req, res)=>{
    res
        .status(405)
        .end()
});
app.patch('/api/:collection', async (req, res)=>{
    res
        .status(405)
        .end()
});
app.delete('/api/:collection', async (req, res)=>{
    res
        .status(405)
        .end()
});


app.post('/login', async (req, res) =>{

    //retrieve data
    await db.getDB()
        .collection('Users')
        .find({"Mail":req.body.Mail})
        .toArray((err,login)=>{
            if(err){
                console.log(err);
                res
                    .status(404)
                    .end()
            } else {
                //res.status=200
                // res
                //     .status(200)
                //     .type('application/json')
                //     .json(collection);

                console.log("Found user:" + login);
                if (login>0) {
                    if (login.Password === req.body.Password) {
                        let privateKey = fs.readFileSync('./private.pem', 'utf8');
                        let token = jwt.sign({"body":"stuff"}, privateKey, {algorithm: 'HS256'});
                        res
                            .status(200)
                            .send(token);
                    }
                } else {
                    res.redirect('/')
                }
            }
        });
});
//app.get('/', (req, res) => res.send("Server is running"))

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
                    .status(403)
            }
            //console.log(decoded);

            return next();
        })
    } else {
        res
            .status(401)
        //res.redirect('/login')
    }
}

function selectSchema(collection, reqBody){
    //console.log(reqBody)

    if(collection == "Users"){
        const newUser = new User;
        
        //const hashedPassword = bcrypt.hash(reqBody.Password, 12);

        newUser.Name = reqBody.Name;
        newUser.Password = reqBody.Password;
        newUser.Mail = reqBody.Mail;
        newUser.BorrowedItems = reqBody.BorrowedItems;
        newUser.admin = reqBody.admin;
        newUser.isDeleted = reqBody.isDeleted;
        
        console.log("User: " + newUser)

        return newUser;
    } else {
        const newMaterial = new Material;

        newMaterial.name = reqBody.name;
        newMaterial.type = reqBody.type;
        newMaterial.createdBy = reqBody.createdBy;
        newMaterial.isBorrowed = reqBody.isBorrowed;
        newMaterial.isDeleted = reqBody.isDeleted;

        console.log("Material: " + newMaterial)

        return newMaterial;
    }

    /*
    

    if(collection == "Users"){
        reqBody.assert('Name', 'Name is required').notEmpty() //Validate name
        reqBody.assert('Password', 'Password is required').notEmpty() //Validate Password
        reqBody.assert('Mail', 'A valid email is required').isEmail() //Validate email
        
        var errors = req.validationErrors()
        if (!errors) { 
            //No errors were found.  Passed Validation!
            newUser.Name = reqBody.Name;
            newUser.Password = reqBody.Password;
            newUser.Mail = reqBody.Mail;
            newUser.BorrowedItems = reqBody.BorrowedItems;
            newUser.admin = reqBody.admin;
            newUser.isDeleted = reqBody.isDeleted;
            
            console.log("User: " + newUser)

            return newUser;
        }
    } else {

        reqBody.assert('name', 'Name is required').notEmpty() //Validate name
        reqBody.assert('type', 'type is required').notEmpty() //Validate type
        reqBody.assert('createdBy', 'createdBy is required').notEmpty() //Validate createdBy
        
        var errors = req.validationErrors()
        if (!errors) { 
            const newMaterial = new Material;

            newMaterial.name = reqBody.name;
            newMaterial.type = reqBody.type;
            newMaterial.createdBy = reqBody.createdBy;
            newMaterial.isBorrowed = reqBody.isBorrowed;
            newMaterial.isDeleted = reqBody.isDeleted;

            console.log("Material: " + newMaterial)

            return newMaterial;
        }
    }
    */
}

db.connect((err)=>{
    // If err unable to connect to database
    // End application
    if(err){
        console.log('Unable to connect to database');
        process.exit(1);
    }
    // Successfully connected to database
    // Start up our Express Application
    // And listen for Request
    else{
        app.listen(port, () => console.log(`Connected to database. Started App on port: ${port}`))
    }
});


//app.listen(port, () => console.log(`Started App on port: ${port}`))

