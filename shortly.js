var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// AUTHENTICATION ---------------------------------------
app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 15000 }})); // use sessions

var restrict = function(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect(301, '/login');
  }
};

app.get('/', restrict, function(req, res) {
  res.render('index');
});

app.get('/create', restrict, function(req, res) {
  res.render('index');
});

app.get('/links', restrict, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links',
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
 
  var username = req.body.username;
  var password = req.body.password;

  new User({ username: username}).fetch().then(function(user) {
    var salt = user.get('salt');
    var hash = user.get('hash');
    var newHash = bcrypt.hashSync(password, salt);
    if (hash === newHash) {
      // generate session 
      req.session.regenerate(function() {
        req.session.user = username;
        res.redirect('/');
      });
    } else {
      res.redirect('/login');
    }
  });
});


app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  // console.log(req);
  var data = req.body;
  var username = data.username;
  var password = data.password;

  new User({ username: username }).fetch().then(function(alreadyExists) {
    if (alreadyExists) {
      res.redirect('/signup');
    } else {
      var salt = bcrypt.genSaltSync(10);
      var hash = bcrypt.hashSync(password, salt);

      Users.create({
        username: username,
        hash: hash,
        salt: salt
      }).then(function() { // test might want autologin
        req.session.regenerate(function() {
          req.session.user = username;
          res.redirect('/');
        });
      });
    }
  });
});




app.get('/logout', function(req, res) {
  req.session.destroy(function() {
    res.redirect('/login');
  });
});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', restrict, function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568); // 4568
