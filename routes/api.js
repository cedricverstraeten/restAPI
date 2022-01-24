const express = require('express');
const router = express.Router();
//const mongoose = require('mongoose');
const jwt = require('jsonwebtoken')
const Joi = require('joi');
const fs = require('fs')

const db = require('../database/mongo');
const { ObjectId } = require('mongodb');
//const { get } = require('https');

const Material = require('../models/Material')


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
router.all('/*', function(req, res, next) {
    //res.header("Access-Control-Allow-Origin", "https://myfablab.herokuapp.com"); // OOK IN /api WAARDE TOEVOEGEN
    res.header("Access-Control-Allow-Origin", "*"); // OOK IN /api WAARDE TOEVOEGEN
    //res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT");
    res.header("X-Content-Type-Options", "nosniff");
    res.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
    next();
  });
//--------------------------------------------------

// //redirect traffic from http to https
// router.all('*', function(request, response){
//     if(request.protocol == 'http'){
//         response.redirect('https://mijntest.herokuapp.com/');
//     }
// });

env = process.env.NODE_ENV || 'development';

var forceSsl = function (req, res, next) {
   if (req.headers['x-forwarded-proto'] !== 'https') {
       return res.redirect(['https://', req.get('Host'), req.url].join(''));
   }
   return next();
};

   
if (env === 'production') {
    router.use(forceSsl);
}


// Get all items of a given collection
router.get('/:collection', async (req,res)=>{

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
router.get('/:collection/:id', isAuthorized, async (req,res)=>{
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
router.options('/:collection', isAuthorized, (req, res)=> {
    res
        .status(204)
        .header('Allow','OPTIONS, GET, POST')
        .end()
});

//Set options voor items in collections
router.options('/:collection/:id', isAuthorized, (req, res)=> {
    res
        .status(204)
        .header('Allow','OPTIONS, DELETE, GET, PUT')
        .end()
});

//Create new item
router.post('/:collection', isAuthorized, async (req, res)=>{
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
router.delete('/:collection/:id', isAuthorized, async (req, res) =>{
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
router.put('/:collection/:id', isAuthorized, async (req, res)=>{
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
router.put('/:collection', async (req, res)=>{
    res
        .status(405)
        .end()
});
router.patch('/:collection', async (req, res)=>{
    res
        .status(405)
        .end()
});
router.delete('/:collection', async (req, res)=>{
    res
        .status(405)
        .end()
});

router.get('/jwt', (req, res) =>{
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


function selectSchema(collection, reqBody){
    //console.log(reqBody)

    if(collection == "Users"){
        const newUser = new User;
        
        const hashedPassword = bcrypt.hash(reqBody.Password, 12);

        newUser.Name = reqBody.Name;
        newUser.Password = hashedPassword;
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

// db.connect((err)=>{
//     // If err unable to connect to database
//     // End application
//     if(err){
//         console.log('unable to connect to database');
//         process.exit(1);
//     }
//     // Successfully connected to database
//     // Start up our Express Application
//     // And listen for Request
//     else{
//         router.listen(port, () => console.log(`Connected to database. Started router on port: ${port}`))
//     }
// });

module.exports = router