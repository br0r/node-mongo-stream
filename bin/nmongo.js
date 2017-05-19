#!/usr/bin/env node
var os = require('os');
var { MongoClient } = require('mongodb');
var Transform = require('stream').Transform;

function exit(msg, db) {
  console.error(msg);
  if (db) {
    return db.close(function () {
      process.exit(1);
    });
  }

  process.exit(1);
}

if (process.argv.length <= 3) {
  exit('Too few arguments, should be `nmongo dburl query`');
}

if (process.argv.length > 4) {
  exit('Too many arguments');
}

var dburl = process.argv[2];
var m = dburl.match(/([^\/]+)\/(.+)/);
var host = m[1] || exit('No host');

var db = m[2] || exit('No db');

var query = process.argv[3];

var url = 'mongodb://' + host + '/' + db;

var toString = new Transform({
  objectMode: true,
  transform(chunk, enc, next) {
    this.push(JSON.stringify(chunk) + os.EOL);
    next();
  },
});

// Parse string to object. Probably exists some better way to do this.
var parseQuery = function (str) {
  var methods = {};
  while (str.length) {
    var key = str.match(/^(\.?[^(]+)/)[1];
    str = str.substr(key.length);
    if (key.charAt(0) === '.') key = key.substr(1);
    var j = 0;
    var arr = str.split('');
    var t = '';
    for (var i = 0; i < arr.length; i += 1) {
      var s = arr[i];
      if (s === '(') j++;
      else if (s === ')') {
        if (j > 1) j--;
        else break;
      } else {
        t += s;
      }
    }

    // Plus enclosing parentheses
    str = str.substr(t.length + 2);
    try {
      if (t === '') {
        methods[key] = {};
      } else {
        methods[key] = JSON.parse(t);
      }
    } catch (e) {
      console.warn('Couldn\'t parse query for ' + key + ', ignoring');
    }
  }

  return methods;
};

MongoClient.connect(url, function (err, db) {
  if (err) exit('Could not connect ' + err);
  var m = query.match(/^db\.([^.]+)(.+)$/);

  if (!m[1]) return exit('Invalid collection', db);
  var collection = db.collection(m[1]);

  // Proper JSON formatting
  var methods = parseQuery(m[2].replace(/([^:{\s,]+)\s*\:/g, '"$1":'));
  if (!methods.find) {
    return exit('Only find supported for now', db);
  }

  var q = collection;
  for (var k in methods) {
    q = q[k](methods[k]);
  }

  q
  .stream()
  .on('error', exit)
  .pipe(toString)
  .on('end', function () {
    db.close(function () {
      process.exit(0);
    });
  })
  .pipe(process.stdout);
});
