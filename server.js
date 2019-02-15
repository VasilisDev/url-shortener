'use strict';

var express = require('express');
// Import Mongoose
var mongoose = require('mongoose');
//enable cors
var cors = require('cors');
// Import Mongo DB
var mongodb = require('mongodb').MongoClient;
//import dns to check if the url is valid
const dns = require('dns');
//autoIncr
var autoIncr = require('mongoose-sequence')(mongoose);
// to parse the post request
var bodyParser = require('body-parser');
//get the local ip
var ip = require("ip");
//init express.js in app
var app = express();
// Basic Configuration
var port = process.env.PORT || 3000;
// db connection
var mongoDB = 'mongodb://<username>:<password>@ds217002.mlab.com:17002/<dbname>';
mongoose.connect(mongoDB, {
  useMongoClient: true
});
// Get the default connection
var db = mongoose.connection;
// error in binding connection
db.on('error', (err) => { console.log('Mongo DB connection error', err); });
//success connection
db.once('open', () => { console.log('Mongo DB connected.'); });
// Schema setup
const Schema = mongoose.Schema;
//Schema of db
const urlSchema = new Schema({
  url: {type: String, required: true},
  shortenedUrl: Number
});
urlSchema.plugin(autoIncr, {inc_field: 'shortenedUrl'});
// Compile model from schema
const UrlModel = mongoose.model('url_model', urlSchema);
/** this project needs to parse POST bodies **/
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));
//home page endpoint
app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

//create new url endpoint
app.post("/api/shorturl/new", function(req,res){
  var completeUrl = req.body.url;
  var newUrl = req.body.url.replace(/https?:\/\//gi, "");
  const url = new UrlModel({url: completeUrl});
  //dns server check if the url is valid
  dns.lookup(newUrl,function(err, address, family) {
    if(err) {
      console.log(err);
      res.json({"error": "invalid URL"});
    }
    else {
      var query = {url:completeUrl};
      //check if the url exists in db
            UrlModel.findOne(query,function(err,data){
          if (err) {throw err;}
          if (data){

            //url exists in db !
res.json({"url": data.url.replace(/https?:\/\//gi, ""), "shortenedUrl": data.shortenedUrl});
          }
          else {
            //if the url doesn't exist in db,save the data
      url.save((err,data) => err ? console.log(err) : res.json({"url":data.url.replace(/https?:\/\//gi, ""), "shortenedUrl": data.shortenedUrl}));
      console.log("Successfull url & short url inserting...");
          }
        });
    }
});
});
//endpoint for redirecting the page threw the short id
app.get("/api/shorturl/:shortenedUrl", function(req,res) {
//check if the short url exists in db
  UrlModel.findOne({shortenedUrl: req.params.shortenedUrl}, (err, data) => err ? console.log(err) : res.redirect(data.url));
});
// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: '404 not found'})
})
// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || '500 Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})
//bind the app to the port
app.listen(port, function () {
  console.log('App starting...');
  console.log('Port: '+port +'\t'+ 'IP: '+ ip.address())
});
