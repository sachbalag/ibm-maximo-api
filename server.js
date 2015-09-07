// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express'); 		// call express
var app        = express(); 				// define our app using express
var cookieParser = require('cookie-parser');
var session      = require('express-session');
var Q = require('q');
var fs = require("fs");
var Maximo = require('ibm-maximo-api');  // Reference to Maximo OSLC API


var port = process.env.PORT || 3000;  // set port,use 3000 for now

var ver = "v1"; // our API version

app.use(cookieParser());
app.use(session({secret: '&25653666%^'}));


// ROUTES FOR OUR API
// =============================================================================
var router = express.Router(); 				// get an instance of the express Router



// middleware to use for all requests
router.use(function(req, res, next)
{
	console.log('Request received by node middleware ...');
	next(); // make sure we go to the next routes and don't stop here
});

// Maximo connection details. Change these props for your Maximo
var options = {
        protocol: 'http',
        hostname: 'localhost',
        port: '7001',
        user: 'wilson',
        password: 'wilson',
        auth_scheme: '/maximo',
        authtype:'maxauth'
    };


// Returns a ResourceSet utilizing all the basic expressions
router.get('/test_resource_set', function(req, res)
{
      var maximo = new Maximo(options);
      maximo.resourceobject("MXWODETAIL")
          .select(["wonum","description","location","status","assetnum.description"])
          .where("status").in(["WAPPR","APPR"])
          .and("worktype").equal('CM')
          .orderby('wonum','desc')
          .pagesize(20)
          .fetch()
          .then(function(resourceset)
              {
                jsondata = resourceset.thisResourceSet();
                res.json(jsondata);
              })
          .fail(function (error)
          {
                console.log('****** Error Code = '+error);
          });
});

// Returns a ResourceSet utilizing all the basic expressions
router.get('/test_asynch_cookie', function(req, res)
{
      var maximo = new Maximo(options);

      var fetchedResource = "";

      var mymaximo = maximo.resourceobject("MXWODETAIL")
                    .select(["wonum","description","location","status","assetnum.description"])
                    .where("status").in(["WAPPR","APPR"])
                    .and("worktype").equal('CM')
                    .orderby('wonum','desc')
                    .pagesize(20);

      mymaximo.fetch().then(function(resourceset)
      {
        console.log("**** FIRST CALL FINISHED SUCCESS ***");
        mymaximo.fetch().then(function(resset)
        {
            jsondata = resset.thisResourceSet();
            res.json(jsondata);

        })
        .fail(function (error)
        {
              console.log('****** Error Code = '+error);
        });
      })
      .fail(function (error)
      {
            console.log('****** Error Code = '+error);
      });

});

router.get('/test_resource_json', function(req, res)
{
      var authcookie = req.session.authcookie;
      var maximo = new Maximo(options,authcookie);
      maximo.resourceobject("MXWODETAIL")
          .select(["wonum","description","reportedby","location","status","assetnum.description"])
          .where("status").in(["WAPPR","APPR"])
          .and("worktype").equal('CM')
          .orderby('wonum','desc')
          .pagesize(10)
          .fetch()
          .then(function(resourceset)
              {
                jsondata = resourceset.JSON();
                req.session.resourcesetjson = jsondata;
                res.json(jsondata);
              })
          .fail(function (error)
          {
                console.log('****** Error Code = '+error);
          });
});

router.get('/authenticate', function(req, res)
{
      var maximo = new Maximo(options);
      maximo.authenticate()
            .then(function(setcookie)
            {
              jsondata = setcookie;
              req.session.authcookie = jsondata; // Set the cookie in the session so we can use it for future requests
              res.json(jsondata);
            })
            .fail(function (error)
            {
                  console.log('****** Error Code = '+error);
            });
});

// Returns a Resource from ResourceSet - Resource #3
router.get('/test_resource', function(req, res)
{
      var authcookie = req.session.authcookie;
      console.log("********* AuthCookie "+authcookie);
      var maximo = new Maximo(options,authcookie);
      maximo.resourceobject("MXWODETAIL")
        .select(["wonum","description","reportedby","location","status","assetnum.assetnum"])
        .where("status").equal('WAPPR')
        //.and("location").equal('POLE300')
        .pagesize(20)
        .fetch()
        .then(function(resourceset)
          {
              req.session.myresourceset = resourceset.thisResourceSet();
              var rsrc = resourceset.resource(3);
              jsondata = rsrc.JSON();
              res.json(jsondata);
          }
        )
        .fail(function (error)
        {
              console.log('****** Error Code = '+error);
        });
});

// Returns a related resource - an asset related to a workorder
router.get('/test_related_resource', function(req, res)
{
      var maximo = new Maximo(options);
      maximo.resourceobject("MXWODETAIL")
        .select(["wonum","description","reportedby","location","status","assetnum.assetnum"])
        .where("status").equal('WAPPR')
        .and("location").equal('POLE300')
        .pagesize(10)
        .fetch()
        .then(function(resourceset)
          {
              resourceset.resource(1)
                        .relatedResource('spi:assetnum')
                        .properties(["spi:assetnum","spi:description","spi:assettype"])
                        .fetch()
                        .then(function(rs)
                          {
                              res.json(rs.JSON());
                          });
          }
        )
        .fail(function (error)
        {
              console.log('****** Error Code = '+error);
        });
});

// Returns a Resource from ResourceSet - Resource #3
router.get('/test_nextpage', function(req, res)
{
      var authcookie = req.session.authcookie;
      var maximo = new Maximo(options,authcookie);
      maximo.resourceobject("MXWODETAIL")
        .nextpage(req.session.resourcesetjson)
        .then(function(resourceset)
              {
                if(resourceset)
                {
                  jsondata = resourceset.JSON();
                  req.session.resourcesetjson = jsondata; /// Store it in the session
                  res.json(jsondata);
                }
                res.json({"status":"End of page"})

              })
          .fail(function (error)
          {
                console.log('****** Error Code = '+error);
          });
});

router.get('/test_twilio', function(req, res)
{
		var authcookie = req.session.authcookie;
		console.log("********* AuthCookie "+authcookie);
		var maximo = new Maximo(options,authcookie);
		var localres = res;
		//var maximo = new Maximo(options);
		maximo.resourceobject("MXWODETAIL")
		.select(["wonum","description","reportedby","location","status","assetnum.assetnum"])
		.where("wonum").equal('1459')
		.pagesize(20)
		.fetch()
		.then(function(resourceset)
		{
			req.session.myresourceset = resourceset.thisResourceSet();
			var rsrc = resourceset.resource(0);
			rsrc.twilio_message(localres);
		})
	.fail(function (error)
	{
				console.log('****** Error Code = '+error);
	});
});

router.get('/test_attachments', function(req, res)
{
    getFileBytes('attachtestt.doc')
    .then(function(fileBuffer)
        {
          console.log("fileBuffer "+fileBuffer.length);
          var authcookie = req.session.authcookie;
          console.log("********* AuthCookie "+authcookie);
          var maximo = new Maximo(options,authcookie);
          //var maximo = new Maximo(options);
          maximo.resourceobject("MXWODETAIL")
          .select(["wonum","description","reportedby","location","status","assetnum.assetnum"])
          .where("wonum").equal('1459')
          .pagesize(20)
          .fetch()
          .then(function(resourceset)
            {
                req.session.myresourceset = resourceset.thisResourceSet();
                var rsrc = resourceset.resource(0);
                var meta = {
                              name: 'pmr.doc',
                              description: 'PMR Recreation Steps',
                              type: 'FILE',
                              storeas: 'Attachment',
                              contentype: 'application/msword'

                          };
                var attch = rsrc.attachment(meta);
                attch.create(fileBuffer)
                .then(function(resc)
                {
                    console.log("Writing Attachment response ");
                    //jsondata = rsrc.JSON();
                    //res.json(jsondata);
                });

            })
          .fail(function (error)
          {
                console.log('****** Error Code = '+error);
          });
        });
});

// Test attach docs
router.get('/test_attachdoc', function(req, res)
{
    fs.stat('attachtestt.doc', function (err, stats)
    {
        if (err)
        {
           return console.error(err);
        }
        console.log(stats);
        console.log("Got file info successfully!");

        // Check file type
        console.log("isFile ? " + stats.isFile());
        console.log("isDirectory ? " + stats.isDirectory());
    });
    var bites = 0;
    console.log("Going to open an existing file");
    fs.open('attachtestt.doc', 'r', function(err, fd)
    {
      if (err)
      {
         return console.error(err);
      }
      console.log("File opened successfully!");
      console.log("Going to read the file");
      fs.read(fd, buf, 0, buf.length, 0, function(err, bytes)
      {
        if (err)
        {
           console.log(err);
        }
        bites = bytes;
        console.log(bytes + " bytes read");

        // Print only read bytes to avoid junk.
        if(bytes > 0)
        {
           console.log(buf.slice(0, bytes).toString());
        }
        // Close the opened file.
        fs.close(fd, function(err){
           if (err){
              console.log(err);
           }
           console.log("File closed successfully.");
        });
        fs.open('newdoc.doc','w', function(err,filedesc)
    {

        console.log("Writing - bytes = "+bites);
        fs.writeFile('newdoc.doc', buf.slice(0, bites),  function(err)
        {
          if (err)
          {
               return console.error(err);
          }
          console.log("Data written successfully!");
          // Close the opened file.
          fs.close(filedesc, function(err){
             if (err){
                console.log(err);
             }
             console.log("File closed successfully.");
          });
        });
    });
      });
    });
});

router.get('/test_temeda', function(req, res)
{
      var props = {
        protocol: 'http',
        hostname: 'qawin03.swg.usma.ibm.com',
        port: '9080',
        user: 'wilson',
        password: 'wilson',
        auth_scheme: '/maximo',
        authtype:'maxauth',
        islean:1
    };
      var maximo = new Maximo(props);
      maximo.resourceobject("MXTEMEDA")
        .select(["assetnum","description","deviceid","temeda.event_description",
                                                     "temeda.enginerpm",
                                                     "temeda.idle_time_count"])
        .where("deviceid").in(["189"],true)
        .pagesize(20)
        .fetch()
        .then(function(resourceset)
          {
              jsondata = resourceset.JSON();
                req.session.resourcesetjson = jsondata;
                res.json(jsondata);
          }
        )
        .fail(function (error)
        {
              console.log('****** Error Code = '+error);
        });
});

router.get('/test_createwo', function(req, res)
{
      var maximo = new Maximo(options);
      maximo.resourceobject("MXWODETAIL")
        .select(["wonum","description","reportedby","location","status","assetnum.assetnum"])
        .where("wonum").equal('1459')
        .pagesize(20)
        .fetch()
        .then(function(resourceset)
          {
              req.session.myresourceset = resourceset.thisResourceSet();
              var rsrc = resourceset.resource(0);
              jsondata = rsrc.JSON();
              res.json(jsondata);
          }
        )
        .fail(function (error)
        {
              console.log('****** Error Code = '+error);
        });
});



// Creates a WOrkorder
router.get('/test_create', function(req, res)
{
  var wo = '';
  var required =
  {
      "spi:description":"Created from API",
      "spi:siteid":"BEDFORD"
  }
  var authcookie = req.session.authcookie;
  var maximo = new Maximo(options,authcookie);

  maximo.resourceobject("MXWODETAIL")
        .create(required,["spi:wonum","spi:description"])
        .then(function(resource)
              {
                jsondata = resource.JSON();
                res.json(jsondata);
              })
          .fail(function (error)
          {
                console.log('****** Error Code = '+error);
          });
});

// Updates a WOrkorder
router.get('/test_update', function(req, res)
{
  var wo = '';
  var updates =
  {
      "spi:description":"Updated from Node API - test crudconnector",
      "spi:siteid":"BEDFORD"
  }

  // Assuming myresourceset was previously placed in session /test_resource
  var authcookie = req.session.authcookie;
  var maximo = new Maximo(options,authcookie);

  maximo.resourceobject("MXWODETAIL")
        .resource(req.session.myresourceset[0]["rdf:about"]) //Pass the URI
        .update(updates,["spi:wonum","spi:description"])
        .then(function(resource)
              {
                var jsondata = resource.JSON();
                res.json(jsondata);
              })
          .fail(function (error)
          {
                console.log('****** Error Code = '+error);
          });
});

// Updates a WOrkorder
router.get('/test_delete', function(req, res)
{
  var wo = '';
  var updates =
  {
      "spi:description":"Updated from Node API - tester",
      "spi:siteid":"BEDFORD"
  }

  // Assuming myresourceset was previously placed in session /test_resource
  var maximo = new Maximo(options);

  maximo.resourceobject("MXWODETAIL")
        .resource(req.session.myresourceset[0]["rdf:about"]) //Pass the URI
        .delete(updates,["spi:wonum","spi:description"])
        .then(function(resource)
              {
                var jsondata = resource.JSON();
                res.json(jsondata);
              })
          .fail(function (error)
          {
                console.log('****** Error Code = '+error);
          });
});



// REGISTER ROUTES -------------------------------
// all routes will be prefixed with /api

app.use('/api/'+ver, router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Maximo Node API server is running on port ' + port);
console.log('API version is ' + ver);

function getFileBytes(path)
{
    var deferred = Q.defer();
    var fileSize = 0
    var buf = new Buffer(fileSize);
    // ******** Start buffering the file bytes **********************
    fs.stat(path, function (err, stats)
    {
        if (err)
        {
           return console.error(err);
        }
        console.log(stats.size);
        fileSize = stats.size;
        buf = new Buffer(fileSize);
        var actualBytes = 0;
        fs.open(path, 'r', function(err, fd)
        {
            if (err)
            {
               return console.error(err);
            }
            console.log("Reading ... ");
            fs.read(fd, buf, 0, buf.length, 0, function(err, bytes)
            {
                if (err)
                {
                   console.log(err);
                }
                console.log(bytes + " bytes read");
                console.log("Actual Buffer Size: "+buf.slice(0,bytes).length);
                deferred.resolve(buf.slice(0,bytes));
                //return buf.slice(0,bytes);
            });
            // Close the opened file.
            fs.close(fd, function(err)
            {
               if (err){
                  console.log(err);
               }
               console.log("File closed successfully.");
            });
        });
        //*******  End buffering file bytes ******
    });
    return deferred.promise;
}
