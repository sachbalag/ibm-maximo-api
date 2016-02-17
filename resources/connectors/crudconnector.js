'use strict';
module.exports = CRUDConnector;
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
//var ResourceSet = require('../resourceset');

/**
 * Asynchronous Http connector to service provider (Maximo etc.)
 *
 * @constructor
 * @param {Object}
 */


function CRUDConnector(maximoRestUrl,maximopath)
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
CRUDConnector.prototype.connection;

CRUDConnector.prototype.isCookieSet;


CRUDConnector.prototype.__create = function(jsonbody,props,attachments,datacallback)
{

	var deferred = Q.defer();
	var returndata = '';
	var client = require(this.maximoRestUrl.protocol.split(':')[0]);
	var statusCode = "";
	var resourceset = "";

	var propsStr = null;
	if (props && props.constructor === Array)
	{
		var arrayLength = props.length;
		for (var i = 0; i < arrayLength; i++)
		{
			var prop = props[i];
			propsStr += prop+",";
		    propsStr = ((arrayLength - i) > 1) ? propsStr+prop+"," : propsStr+prop;
		}
	}

	var options = {
        hostname: this.maximoRestUrl.hostname,
        port: this.maximoRestUrl.port,
        headers: getAuthTypeHeader(props,jsonbody,this, null, null),
        path: this.maximopath,
        method: 'POST'
    	};

    var req = client.request(options, function(res)
    {
  			res.setEncoding('utf8');
  			var resdata = '';
  			res.on('data', function (chunk)
  			{
  				resdata += chunk;
  			});
  			res.on('error', function(err)
			{
			    console.log('Error retrieving data... ' + err.message);
			    deferred.reject("Error retrieving data...."+ err.message);
			});
  			res.on('end', function()
		  	{
		  		var data = null;
		  		if(res.statusCode == 201 && resdata == "")
		  		{
		  			data = {"error code":"201","description":"Properties are required for Create API"};
		  		} else
		  		{
		  			console.log("***** RESPONSE "+res.statusCode);
		  			data = JSON.parse(resdata)
		  		}
			  	var resourcemem = new Resource(data,this.connection);
			  	statusCode = res.statusCode;
			  	if (datacallback)
			  	{
			  		deferred.promise.nodeify(datacallback(statusCode,resourcemem,this));
			  	} else
			  	{
			  		deferred.resolve(resourcemem);
			  	}
		   });
	});

    req.on('error', function(e)
    {
  		console.log('problem with request: ' + e.message);
	});


    req.write(JSON.stringify(jsonbody));
	req.end();
  //return this;*/
  return deferred.promise;
}

CRUDConnector.prototype.__crud = function(jsonbody,props,current,method,xmethod,patchtype,datacallback)
{
	var deferred = Q.defer();
	var returndata = '';
	var client = require(current.resourceURI.split(':')[0]);
	var host = current.resourceURI.split(':')[1].split("//")[1];
	var port = current.resourceURI.split(':')[2].split("/")[0];
	var path = current.resourceURI.split(host)[1].split(port)[1];
	if(! current.isCookieSet)
	{
		var xpublicuri = current.connection.protocol+"//"+current.connection.hostname+":"+current.connection.port+X_PUB_PATH;
	}
	// If this.cookie type === object it means it's a URL so we need to login
	/*var hdr = (typeof(current.cookie) === "object")
				?
					{'MAXAUTH': new Buffer(current.cookie.auth).toString('base64'),
    			  			'x-public-uri':xpublicuri.toString()}
    			:
    				{'Cookie' : current.cookie};*/
	var statusCode = "";
	var resourceset = "";
	var options = {
        hostname: host,
        port: port,
        headers: getAuthTypeHeader(props,jsonbody,current,xmethod,patchtype),
        path: path,
        method: method
    	};

     var req = client.request(options, function(res)
     {
  			res.setEncoding('utf8');
  			var resdata = '';
  			res.on('data', function (chunk)
  			{
  				resdata += chunk;
  			});
  			res.on('error', function(err)
			{
			    console.log('Error retrieving data... ' + err.message);
			    deferred.reject("Error retrieving data...."+ err.message);
			});
  			res.on('end', function()
		  	{
		  		var data = null;
		  		if(res.statusCode == 201 && resdata == "")
		  		{
		  			data = {"error code":"201","description":"Required headers may not be set e.g. properties"};
		  		} else
		  		{
		  			var scode = res.statusCode;
		  			data = (method === 'DELETE') ? {"status code":scode,"description":"Delete successful"} : JSON.parse(resdata);
		  		}
			  	var resourcemem = new Resource(data,current.connection);
			  	statusCode = res.statusCode;
			  	if (datacallback)
			  	{
			  		deferred.promise.nodeify(datacallback(statusCode,resourcemem,current));
			  	} else
			  	{
			  		deferred.resolve(resourcemem);
			  	}
		   });
	});

    req.on('error', function(e)
    {
  		console.log('problem with request: ' + e.message);
	});


    req.write(JSON.stringify(jsonbody));
	req.end();
  //return this;
  return deferred.promise;
};

// Private Methods

function getCRUDprops(props)
{
	return props.toString();
}

function getAuthTypeHeader(props,jsonbody,my,xmethod,patchtype)
{
	var hdr = null;
	var propsStr = getCRUDprops(props);
	if(! my.isCookieSet)
	{
		console.log("Auth header type = MaxAuth "+JSON.stringify(my.connection));
		hdr = (propsStr) ?
						{'MAXAUTH': new Buffer(my.connection.auth).toString('base64'),
		    			   'content-type': 'application/json',
		    			   'x-method-override': xmethod,
		    			   'PATCHTYPE':patchtype,
		    			   'properties': propsStr,
		    			   'body':JSON.stringify(jsonbody)}
		    		  :
		    		  	{'MAXAUTH': new Buffer(my.connection.auth).toString('base64'),
		    			   'content-type': 'application/json',
		    			   'x-method-override': xmethod,
		    			   'PATCHTYPE':patchtype,
		    			   'body':JSON.stringify(jsonbody)}
	} else
	{
		//console.log("Auth header type = cookie"+JSON.stringify(my.cookie));
		hdr = (propsStr) ?
						{'Cookie' : my.cookie,
		    			   'content-type': 'application/json',
		    			   'x-method-override': xmethod,
		    			   'PATCHTYPE':patchtype,
		    			   'properties': propsStr,
		    			   'body':JSON.stringify(jsonbody)}
		    		  :
		    		  	{'Cookie' : my.cookie,
		    			   'content-type': 'application/json',
		    			   'x-method-override': xmethod,
		    			   'PATCHTYPE':patchtype,
		    			   'body':JSON.stringify(jsonbody)}
	}
	return hdr;
}
