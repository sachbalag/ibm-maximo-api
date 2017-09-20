'use strict';
module.exports = SchemaConnector;
var url = require('url');
var buffer = require('buffer');
var http   = require('http');
var Q = require('q');
var querystring = require("querystring");
var REST_PATH = '/maximo/oslc/os/';
var X_PUB_PATH = '/maximo/oslc/';
var REST_PATH = '/maximo/oslc/os/';
var AUTH_PATH = '/maximo/oslc/';

var Resource = require('../resource');
var ResourceSet = require('../resourceset');

/**
 * Asynchronous Http connector to service provider (Maximo etc.)
 *
 * @constructor
 * @param {Object}
 */


function SchemaConnector(maximoRestUrl,maximopath)
{
	X_PUB_PATH = maximoRestUrl.auth_scheme + '/oslc/';

	this.maximoRestUrl = maximoRestUrl;
	this.client = require(this.maximoRestUrl.protocol.split(':')[0]);
	this.xpublicuri = this.maximoRestUrl.protocol+"//"+this.maximoRestUrl.hostname+":"+this.maximoRestUrl.port+X_PUB_PATH;
 	this.maximopath = maximopath;
 	this.cookie = null;
 	this.isCookieSet = "false";

};

// Expose these properties
SchemaConnector.prototype.cookie;

SchemaConnector.prototype.isCookieSet;


SchemaConnector.prototype.__fetch = function(myconnector,datacallback)
{
	var deferred = Q.defer();
	var returndata = '';
	//var client = require(this.maximoRestUrl.protocol.split(':')[0]);
	var statusCode = "";
	var resourceset = "";
	console.log(this.maximopath);
	var options = {
        hostname: this.maximoRestUrl.hostname,
        port: this.maximoRestUrl.port,
        headers: getAuthTypeHeader(this,myconnector),
        path: this.maximopath
    };
	var ac = this.cookie;  // make a local copy so it's in context for the callback
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
			//console.log("***** AC ***"+ac);
			//If ac is null that means the user did not pass in an auth token.

			ac = (ac === null) ? response.headers['set-cookie'] : ac

	  	var data = JSON.parse(resdata);
			statusCode = response.statusCode;
	  	if (datacallback)
	  	{
	  		deferred.promise.nodeify(datacallback(statusCode,data,this));
	  	} else
	  	{
	  		deferred.resolve(data);
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
		console.log("Auth header type = cookie"+my.cookie);
		hdr = {'Cookie' : my.cookie};
	}
	return hdr;
}