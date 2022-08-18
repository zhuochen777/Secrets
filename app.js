//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    username: String,
    password: String
});

//add plugin to schema before creating mongoose model
//use secret long string to encrypt our database
userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});//access SECRET variable in .env
//add encrypt as a plugin to schema and pass in secret long string and only encrypt password field

const User = mongoose.model("User", userSchema);

//to do
app.get("/", function(req, res) {
    res.render("home");
});

app.get("/login", function(req, res) {
    res.render("login");
});

app.get("/register", function(req, res) {
    res.render("register");
});


app.post("/register", function(req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    user.save(function(err) {
        if (!err) {
            res.render("secrets");
        } else {
            console.log(err);
        }
    });

});

app.post("/login", function(req, res) {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({username: username}, function(err, foundUser) {
        if (!err) {
            if (foundUser.password === password) {
                res.render("secrets");
            } else {
                res.send("no matching username and password found!");
            }
        } else {
            console.log(err);
        }
    });
});

app.listen(3000, function() {
    console.log("server started on port 3000");
});
