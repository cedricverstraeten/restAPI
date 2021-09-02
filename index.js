const express = require('express')
const bodyParser = require("body-parser")
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs');
const passport = require('passport');

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
app.use('/api', require ('./routes/api'));




//------------------------------------------
//Allow all requests from all domains & localhost
app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000"); // OOK IN /api WAARDE TOEVOEGEN
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "POST, GET");
    res.header("X-Content-Type-Options", "nosniff");
    res.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
    next();
  });
//--------------------------------------------------

//redirect traffic from http to https
app.use(function(request, response){
    if(!request.secure){
      response.redirect("https://" + request.headers.host + request.url);
    }
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

                //console.log(login.count < 0)    
                // console.log(login[0].Mail)
                // console.log(login<0)
                if(login == 0 ){
                    res
                        .status(404)
                        .end()
                } else {
                    //console.log(login)
                    if (login[0].Password === req.body.Password) {
                        res
                            .status(200)
                            .end()
                        
                    } else {
                        res
                            .status(404)
                            .end()
                    }
                }


                // res.status=200
                // res
                //     //.status(200)
                //     .type('application/json')
                //     .json(login);
            }
        })
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

app.post('/test', async (req, res) => {
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

                //console.log(login.count < 0)    
                // console.log(login[0].Mail)
                // console.log(login<0)
                if(login == 0 ){
                    res
                        .status(404)
                        .end()
                } else {
                    //console.log(login)
                    if (login[0].Password === req.body.Password) {
                        res
                            .status(200)
                            .end()
                        
                    } else {
                        res
                            .status(404)
                            .end()
                    }
                }


                // res.status=200
                // res
                //     //.status(200)
                //     .type('application/json')
                //     .json(login);
            }
        })
});


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
        app.listen(process.env.PORT || port, () => console.log(`Connected to database. Started App on port: ${port}`))
    }
});


//app.listen(port, () => console.log(`Started App on port: ${port}`))

