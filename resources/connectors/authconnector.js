'use strict';
module.exports = AuthConnector;
var url = require('url');
var buffer = require('buffer');
var http   = require('http');
var Q = require('q');
var querystring = require("querystring");
var REST_PATH = '/maximo/oslc/os/';
var X_PUB_PATH = '/maximo/oslc/';
var REST_PATH = '/maximo/oslc/os/';
var AUTH_PATH = '/maximo/oslc/';

/**
 * Asynchronous Http connector to service provider (Maximo etc.)
 *
 * @constructor
 * @param {Object}
 */


function AuthConnector(maximoRestUrl,maximopath)
{
	this.maximoRestUrl = maximoRestUrl;
	this.client = require(this.maximoRestUrl.protocol.split(':')[0]);
	this.xpublicuri = this.maximoRestUrl.protocol+"//"+this.maximoRestUrl.hostname+":"+this.maximoRestUrl.port+X_PUB_PATH;
 	this.maximopath = maximopath;
 	this.cookie = null;
 	this.isCookieSet = "false";

};

// Expose these properties
AuthConnector.prototype.cookie;

AuthConnector.prototype.isCookieSet;

AuthConnector.prototype.auth_scheme;

AuthConnector.prototype.authType;


AuthConnector.prototype.authenticate = function(myconnector,datacallback)
{
	var deferred = Q.defer();
	var returndata = '';
	//var client = require(this.maximoRestUrl.protocol.split(':')[0]);
	var statusCode = "";
	var resourceset = "";
	var options = {
        hostname: this.maximoRestUrl.hostname,
        port: this.maximoRestUrl.port,
        headers: getAuthTypeHeader(this,myconnector),
        path: AUTH_PATH,
    };

      var restcallback = function(response)
      {
		  var resdata = '';
		  response.on("data", function(chunked)
		  {
		  		resdata += chunked;
		  });

		  response.on('error', function(err)
		  {
		         console.log('Error retrieving data... ' + err.message);
		         deferred.reject("Error retrieving data...."+ err.message);
		  });

		  response.on('end', function()
		  {
		  	// Save the cookie (jsessionid, ltpa token etc.. etc..) for future use so we can participate
		  	// in any authentication strategy the client provides.
		  	var setCookieValue = response.headers['set-cookie'];
		  	this.cookie = {"set-cookie":setCookieValue};
		  	this.isCookieSet = "true";
		  	myconnector.cookie = this.cookie //response.headers['set-cookie'];
		  	myconnector.isCookieSet = "true";
		  	statusCode = response.statusCode;
		  	if (datacallback)
		  	{
		  		deferred.promise.nodeify(datacallback(statusCode,this.cookie,this));
		  	} else
		  	{
		  		deferred.resolve(this.cookie);
		  	}
		  	//datacallback(response.statusCode,resourceset,this);  //Invoke the callback and pass the data back.
		   });
	}

   // Request the data (Asynch) from Maximo and handle the response in the callback above ... Ideally Maximo should give us a Promise so we don't
   // have to handle the Asynch in a callback.
  this.client.request(options, restcallback).end();
  //return this;
  return deferred.promise;
};


AuthConnector.prototype.getAuthTypeHeader = function(my,fconnect)
{
	return getAuthTypeHeader(my,fconnect);
}


// Private Methods

function getAuthTypeHeader(my,fconnect)
{
	var hdr = "";
	if(my.cookie == null)
	{
		console.log("Auth header type = "+fconnect.authType);
		switch (fconnect.authType)
		{
		   case "basic":
		   		hdr = {'Authorization': 'Basic '+new Buffer(fconnect.maximoRestUrl.auth).toString('base64'),
		   	   		  'x-public-uri':fconnect.xpublicuri.toString()};

		   case "form":
		       hdr = {'Accept': 'text/html,application/xhtml+xml,application/xml',
		   	   		  'Content-Type':'application/x-www-form-urlencoded',
		   	   		  'Connection':'keep-alive'};
		       break;

		   case "maxauth":
		       hdr = {'maxauth': new Buffer(fconnect.maximoRestUrl.auth).toString('base64'),
		   	   		  'x-public-uri':fconnect.xpublicuri.toString()};
		       break;

		   // Default it to MaxAuth for now.
		   default:
		   	   hdr = {'maxauth': new Buffer(fconnect.maximoRestUrl.auth).toString('base64'),
		   	   		  'x-public-uri':fconnect.xpublicuri.toString()};
		       break;
		}
	} else
	{
		console.log("Auth header type = cookie");
		hdr = {'Cookie' : my.cookie};
	}
	return hdr;
}
