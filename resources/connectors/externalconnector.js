'use strict';
module.exports = ExternalConnector;
var url = require('url');
var buffer = require('buffer');
var http   = require('http');
var https   = require('https');
var Q = require('q');
var querystring = require("querystring");

/**
 * Asynchronous Http connector to service provider (Maximo etc.)
 *
 * @constructor
 * @param {Object}
 */


function ExternalConnector(options,resourceset)
{
		this.options = options;
		this.resourceset = resourceset;
		this.protocol = (options.protocol == null)? "http": options.protocol;
		this.client = require(this.protocol);
		this.host = options.host;
		this.port = options.port;
		this.endpoint = options.endpoint;
		this.headers = options.headers;
		this.template = options.template;
		this.path = options.path;
		this.originalpath = options.path;
		//initialize some instance variables
		this.promises = [];
};

ExternalConnector.prototype.path = function(path)
{
		this.path = path;
}

ExternalConnector.prototype.push = function(i)
{
	if(this.template != null && this.template["prependtopath"] != null)
	{
		var substitute = this.template["prependtopath"]["substitute"];
		var text = this.template["prependtopath"]["text"];
		if (substitute != null)
		{
				var token = substitute.split(".");
				var related = this.resourceset[i][token[0]];
				if(related != null)
				{
					var value = related[0][token[1]];
					this.path = this.endpoint+value+text+this.originalpath;
					this.promises.push(asynch(this));
				}
		}
	}
}

ExternalConnector.prototype.resolve = function(datacallback)
{
		var deferred = Q.defer();
		Q.all(this.promises).then(function(data)
		{
				if (datacallback)
				{
					deferred.promise.nodeify(datacallback(data));
				} else
				{
					deferred.resolve(data);
				}
		})
		.fail(function (error)
		{
					console.log('****** Error Code = '+error);
		});
		return deferred.promise;
}

function asynch(my,datacallback)
{
	var deferred = Q.defer();
	var returndata = '';
	//var client = require(this.maximoRestUrl.protocol.split(':')[0]);
	var statusCode = "";
	var resourceset = "";
	console.log("***** "+my.host+" **** "+my.path);
	var options = {
        hostname: my.host,
        port: my.port,
				path: my.path
        //path: "v1/location/02375:4:US/forecast/daily/10day.json?apiKey=34b54a2413263374bdace07052e0fdf3"
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
			console.log("%%%%Status code "+response.statusCode);
	  	var data = JSON.parse(resdata);
			statusCode = response.statusCode;
	  	if (datacallback)
	  	{
	  		deferred.promise.nodeify(datacallback(statusCode,data,my));
	  	} else
	  	{
	  		deferred.resolve(data);
	  	}
	  	//datacallback(response.statusCode,resourceset,this);  //Invoke the callback and pass the data back.
	   });
	}
   // Request the data (Asynch) from Maximo and handle the response in the callback above ... Ideally Maximo should give us a Promise so we don't
   // have to handle the Asynch in a callback.
  my.client.request(options, restcallback).end();
  //return this;
  return deferred.promise;
};
