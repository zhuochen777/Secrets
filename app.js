//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

//set up session using session package with initial configuration
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

//initialize passport
app.use(passport.initialize());

//use passport to set up session
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String
});

//add plugin to mongoose schema, use passport local mongoose to hash and salt passwords and save users into mongodb db
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

//use passport to create local login strategy
passport.use(User.createStrategy());

//code copied from session on https://www.passportjs.org/concepts/authentication/sessions/
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({//code copied from https://www.passportjs.org/packages/passport-google-oauth20/
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    //user.findOrCreate is not a mongoose function, need to npm install mongoose-findorcreate package
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//to do
app.get("/", function(req, res) {
    res.render("home");
});

//code copied from https://www.passportjs.org/packages/passport-google-oauth20/
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));


app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  });


app.get("/login", function(req, res) {
    res.render("login");
});

app.get("/register", function(req, res) {
    res.render("register");
});

app.get("/secrets", isLoggedIn, function(req, res) {
    res.render("secrets");
});

app.get("/logout", function(req, res) {
    req.logOut(function(err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/");
        }
    });

});

app.post("/register", function(req, res) {
    //.register comes from passport-local-mongoose package
    User.register({username: req.body.username}, req.body.password, function(err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/secrets");
            });
        };
    });

});

app.post("/login", function(req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/secrets");
            });
        }
    });


});

// check isLoggedIn
function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}


app.listen(3000, function() {
    console.log("server started on port 3000");
});
