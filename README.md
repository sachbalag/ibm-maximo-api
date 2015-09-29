# IBM-Maximo-API

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=<git_repository_URL> # [required])

## Introduction

This module includes a set of fluent API's for interfacing with Maximo by providing a high level abstraction for the
Maximo REST API's. The intent is to shield developers from low level details and help them focus on their own implementation 
logic.

## Installing

Assumes [Node](https://nodejs.org/en/) and [Express](http://expressjs.com/) are installed.

$ npm install --save ibm-maximo-api

## Usage

There are three main components ....



#### Requiring Maximo

Like any other Node.js module the "maximo" module has to be loaded and assigned a local reference in your code. The easiest
way to do this is using the built-in require() function.

    var Maximo = require('ibm-maximo-api');

The require() function returns a prototype (class) and assigns it to the local variable Maximo in the example above. 


#### Constructor and Authentication

After a local reference has been assigned using the require() function you can easily instantiate an object like this:

    var maximo = new Maximo(options,[authcookie]);


The constructor accepts two parameters:

    options: This parameter is REQUIRED and is represented by an object like this:
              {
                  protocol: 'http',
                  hostname: 'qawin03.swg.usma.ibm.com',
                  port: '9080',
                  user: 'wilson',
                  password: 'wilson',
                  auth_scheme: '/maximo',
                  authtype:'maxauth',
                  islean:1
              }
  
    authcookie: This parameter is OPTIONAL.
                If this parameter is null the Create, Read, Update and Delete (CRUD) api's will attempt to 
                authenticate with Maximo everytime a CRUD operation is invoked.

If CRUD's are invoked multiple times it is recommended to authenticate first via the authenticate() function. If the 
authentication is sucessful a token(jsessionID) will be returned. Save the token in the request session so it can be
read and passed into the constructor for subsequent requests. The following code snippet illustrates a GET route that
authenticates with maximo and stores the token inside the session.

    app.get('/authenticate', function(req, res)
    {
      var maximo = new Maximo(options);
      maximo.authenticate()
            .then(function(jsessionid)
            {
              req.session.authcookie = jsessionid; // Set the token in the session so we can use it for future requests
              res.json(jsessionid); // Handle the response after setting the token in the session.
            })
            .fail(function (error)
            {
                  console.log('****** Error Code = '+error);
            });
    }

The authenticate() function is asynchronous therefore it returns a defered [Promise](https://www.npmjs.com/package/q) 
which is fulfilled inside the then() function or the fail() function if the promise is rejected. 
In either case the response is handled inside the callback as illustrated in the code snippet above.


#### Fetch

The following code snippet illustrates how to use the fetch API. This example returns a ResourceSet and uses all the basic
expressions available.

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

#### Next Page

The following code snippet illustrates the Paging api. In this example we are assuming that the initial set is fetched
with the pagesize() set to a low number like 20 and stored in the session (req.session.resourcesetjson).

    router.get('/test_nextpage', function(req, res)
    {
      var authcookie = req.session.authcookie;
      var maximo = new Maximo(options,authcookie);
      maximo.resourceobject("MXWODETAIL")
            .nextpage(req.session.resourcesetjson) // The paged resource is stored in session
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

#### Create

The following code snippet illustrates the Create api. In this example we are creating a new Workorder.

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

#### Update

The following code snippet illustrates the Update api. In this example we are assuming the resourceset is saved
in the session (req.session.myresourceset) and we are updating the first record in the set by passing 
the resource URL (req.session.myresourceset[0]["rdf:about"]). The resource URL for the update is contained in "rdf:about".

    router.get('/test_update', function(req, res)
    {
      var wo = '';
      var updates =
      {
          "spi:description":"Updated from Node API - test crudconnector",
          "spi:siteid":"BEDFORD"
      }
    // Assuming myresourceset was previously placed in session
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

#### Delete

The following code snippet illustrates the Delete api. In this example we are assuming the resourceset is saved
in the session (req.session.myresourceset) and we are updating the first record in the set by passing 
the resource URL (req.session.myresourceset[0]["rdf:about"]). The resource URL for the update is contained in "rdf:about".

    router.get('/test_update', function(req, res)
    {
      // Assuming myresourceset was previously placed in session
      var authcookie = req.session.authcookie;
      var maximo = new Maximo(options,authcookie);
      maximo.resourceobject("MXWODETAIL")
        .resource(req.session.myresourceset[0]["rdf:about"]) //Pass the URI
        .delete(["spi:wonum","spi:description"])
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

#### Attachments

The following code snippet illustrates the Attachments api.

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

## Contact

  - [Sachin Balagopalan](sachin.balagopalan@us.ibm.com)

## License

(C) Copyright IBM Corp. 2015 All Rights Reserved
