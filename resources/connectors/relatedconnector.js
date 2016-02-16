'use strict';
module.exports = RelatedConnector;
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


function RelatedConnector(maximoRestUrl,maximopath)
{
	if(maximoRestUrl)
	{
		X_PUB_PATH = maximoRestUrl.auth_scheme + '/oslc/';
		
		this.maximoRestUrl = maximoRestUrl;
		if(typeof(this.maximoRestUrl) === "string")
		{
			var urlarray = this.maximoRestUrl.split(':');
			var port = urlarray[2].split("/")[0];
			this.client = require(urlarray[0]);
			this.xpublicuri = urlarray[0]+":"+urlarray[1]+":"+port+X_PUB_PATH;
			console.log("***** this.xpublicuri "+this.xpublicuri)
		} else
		{
			this.client = require(this.maximoRestUrl.protocol.split(':')[0]);
			this.xpublicuri = this.maximoRestUrl.protocol+"//"+this.maximoRestUrl.hostname+":"+this.maximoRestUrl.port+X_PUB_PATH;
		}
	}
 	this.maximopath = maximopath? maximopath : null;
 	this.connection = maximoRestUrl; // this.connection is exposed and may be overridden later.
 	this.isCookieSet = "false";

};

// Expose these properties
RelatedConnector.prototype.cookie;

RelatedConnector.prototype.isCookieSet;


RelatedConnector.prototype.__fetch = function(current,myconnector,datacallback)
{
	var deferred = Q.defer();
	var returndata = '';
	//var client = require(this.maximoRestUrl.protocol.split(':')[0]);
	var statusCode = "";
	var resourceset = "";
	var host = current.resourceURI.split(':')[1].split("//")[1];
	var port = current.resourceURI.split(':')[2].split("/")[0];
	var path = current.resourceURI.split(host)[1].split(port)[1];
	this.connection = current.connection;
	var options = {
        hostname: host,
        port: port,
        headers: getAuthTypeHeader(this,myconnector),
        path: path
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
	  	//resourceset = new ResourceSet(data["rdfs:member"],this.cookie); // send back the data wrapped inside ResourceSet
			resourceset = new ResourceSet(data,ac); // send back the data wrapped inside ResourceSet
			statusCode = response.statusCode;
	  	if (datacallback)
	  	{
	  		deferred.promise.nodeify(datacallback(statusCode,resourceset,this));
	  	} else
	  	{
	  		deferred.resolve(resourceset);
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



RelatedConnector.prototype.__fetchnext = function(np,myconnector,datacallback)
{
	var deferred = Q.defer();

	// If the type is Object we assume this is the ResourceSet JSON so let's get the nextpage URI
	//var np_uri = (typeof(np) === 'object') ? np["oslc:responseInfo"]["oslc:nextPage"]["rdf:resource"]
	//									   : np;
	var np_uri = nextPage(np);
	if(np_uri)
	{
		var nextpath = np_uri.substr( np_uri.indexOf(this.maximoRestUrl.port)+this.maximoRestUrl.port.length);
		var returndata = '';
		var client = require(this.maximoRestUrl.protocol.split(':')[0]);
		var statusCode = "";
		var resourceset = "";
		var xpublicuri = this.maximoRestUrl.protocol+"//"+this.maximoRestUrl.hostname+":"+this.maximoRestUrl.port+X_PUB_PATH;
		var options = {
	        	hostname: this.maximoRestUrl.hostname,
	        	port: this.maximoRestUrl.port,
	        	headers: getAuthTypeHeader(this,myconnector),
	        	path: nextpath
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
			  	// Save the jsessionid for future use....
			  	this.cookie = response.headers['set-cookie'];
		      	if(this.cookie)
			  	{
	        		this.cookie = (this.cookie + '').split(";")[0];
	        	}
			  	var data = JSON.parse(resdata);
			  	//resourceset = new ResourceSet(data["rdfs:member"],this.cookie); // send back the data wrapped inside ResourceSet
			  	resourceset = new ResourceSet(data,this.cookie); // send back the data wrapped inside ResourceSet
			  	statusCode = response.statusCode;
			  	if (datacallback)
			  	{
			  		deferred.promise.nodeify(datacallback(statusCode,resourceset,this));
			  	} else
			  	{
			  		deferred.resolve(resourceset);
			  	}
			  	//datacallback(response.statusCode,resourceset,this);  //Invoke the callback and pass the data back.
			   });
		}

	   // Request the data (Asynch) from Maximo and handle the response in the callback above ... Ideally Maximo should give us a Promise so we don't
	   // have to handle the Asynch in a callback.
	  client.request(options, restcallback).end();
	  //return this;
	  return deferred.promise;
	}
	console.log("********* NOT Set ****    "+np);
	//deferred.resolve({"status":"End of Page"});
	return np;
}

// Private Methods

function getAuthTypeHeader(my,fconnect)
{
	var hdr = "";
	if(my.connection == null)
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
		console.log("Auth header type = cookie"+my.connection);
		hdr = {'Cookie' : my.connection};
	}
	return hdr;
}

function nextPage(np)
{
	if(typeof(np) === 'object' && (np["oslc:responseInfo"] && np["oslc:responseInfo"]["oslc:nextPage"]))
	{
		return np["oslc:responseInfo"]["oslc:nextPage"]["rdf:resource"]
	}
	return np["rdf:about"];
}
