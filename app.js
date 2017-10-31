var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var routes = require('./apis.js').router;
var connectDB = require('./apis.js').connectDB;
var port = 3000;

app.use(bodyParser.json({ limit: '5mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));
app.use('/', routes);

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);      //es6 template string
    })
  })
  .catch((err) => {
    console.log(JSON.stringify(err, null, 2));
  });
