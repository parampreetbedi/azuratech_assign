var router = require('express').Router(),
    multer = require('multer'),
    fs = require('fs'),
    AWS = require('aws-sdk');
const {MongoClient} = require('mongodb');         //es6 const & object destructuring
var db = null;

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname)
    }
});
var limits = {
    'fileSize': 5242880,      //5 mb
    'files': 1
};
var upload = multer({ storage: storage, limits: limits });

var options = {
  accessKeyId : 'AKIAJF42XZJXRIFWOALQ',
  secretAccessKey : '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',
  region : 'ap-south-1',
  bucket : 'param-bucket'
}

var s3 = new AWS.S3(options);

var connectDB = function(){
  return new Promise((resolve, reject) => {       //es6 promise
    MongoClient.connect('mongodb://localhost:1111/testDB', (err, dbInstance) =>{
      if(err){
        reject(err);
      }
      else{
        db = dbInstance;
        resolve();
      }
    });
  });
};

var uploadImageS3 = function(objFile, fileName){
  return new Promise((resolve, reject) => {
    s3.putObject({
      Bucket : options.bucket,
			Key : fileName,
			Body : objFile
		}, (err, data) => {
			if (err){
				reject(err);
			}
      else {
        resolve(`https://s3.${options.region}.amazonaws.com/${options.bucket}/${encodeURIComponent(fileName)}`);
      }
		});
  });
};

var getImageS3 = function(fileName){
  return new Promise((resolve, reject) => {
    s3.getObject({
      Bucket : options.bucket,
			Key : fileName
		}, (err, data) => {
			if (err){
				reject(err);
			}
      else {
        resolve(data);
      }
		});
  });
};

var deleteImageS3 = function(fileName){
  return new Promise((resolve, reject) => {
    s3.deleteObject({
      Bucket : options.bucket,
			Key : fileName
		}, (err, data) => {
			if (err){
				reject(err);
			}
      else {
        resolve(data);
      }
		});
  });
};

router.get('/emplData/:id', (req, res) => {              //es6 arrow functions
  let eId = req.params.id;

  db.collection('employeeData').findOne({
    'eId' : eId
  })
    .then((result) => {
      var fileName = decodeURIComponent(result.imagePath.substring(result.imagePath.lastIndexOf('/')+1));
      return getImageS3(fileName);
    })
    .then((data) => {
      fs.writeFile(__dirname+'/downloads/image.png', data.Body, (err) => {
        if (err) res.send(err);
        res.send('The file has been downloaded!');
      });
    })
    .catch((err) => {
      console.log(JSON.stringify(err,null,2));
      res.send(err);
    });
});

router.post('/emplData', upload.single('file1'), (req, res) => {
  let eId = req.body.eId;                                //es6 let variable
  let fName = req.body.fName;
  let isFullTime = JSON.parse(req.body.isFullTime.toLowerCase());

  var fileName = req.file.filename;
  var imagePath = './uploads/' + fileName;
  var objFile = fs.createReadStream(imagePath);

  uploadImageS3(objFile, fileName)
    .then((s3ImagePath) => {
      fs.unlinkSync(imagePath);
      return db.collection('employeeData').insert({
        'eId' : eId,
        'fName' : fName,
        'isFullTime' : isFullTime,
        'imagePath' : s3ImagePath
      });
    })
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      console.log(JSON.stringify(err, null, 2));
      res.send(err);
    });
});

router.put('/emplData', upload.single('file1'), (req, res) => {
  let eId = req.body.eId;
  let fName = req.body.fName;
  let isFullTime = JSON.parse(req.body.isFullTime.toLowerCase());

  var fileName = req.file.filename;
  var imagePath = './uploads/' + fileName;
  var objFile = fs.createReadStream(imagePath);

  db.collection('employeeData').findOne({
    'eId' : eId
  })
    .then((result) => {
      let fileName = decodeURIComponent(result.imagePath.substring(result.imagePath.lastIndexOf('/')+1));
      return deleteImageS3(fileName);
    })
    .then((data) => {
      return uploadImageS3(objFile, fileName);
    })
    .then((s3ImagePath) => {
      fs.unlinkSync(imagePath);
      return db.collection('employeeData').updateOne({ 'eId' : eId },
        {
          $set: {
            'fName' : fName,
            'isFullTime' : isFullTime,
            'imagePath' : s3ImagePath
          }
        })
    })
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      console.log(JSON.stringify(err, null, 2));
      res.send(err);
    });
});

router.delete('/emplData/:id', (req, res) => {
  let eId = req.params.id;

  db.collection('employeeData').findAndRemove({
    'eId' : eId
  })
    .then((result) => {
      var fileName = decodeURIComponent(result.value.imagePath.substring(result.value.imagePath.lastIndexOf('/')+1));
      return deleteImageS3(fileName);
    })
    .then((data) => {
      res.send('document deleted');
    })
    .catch((err) => {
      console.log(JSON.stringify(err, null, 2));
      res.send(err);
    })
});

module.exports.router = router;
module.exports.connectDB = connectDB;
