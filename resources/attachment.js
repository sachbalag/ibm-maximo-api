'use strict';
module.exports = Attachment;
var url = require('url');
var buffer = require('buffer');
var http   = require('http');
var REST_PATH = '/maximo/oslc/os/';
var X_PUB_PATH = '/maximo/oslc/';
var Q = require('q');
var ResourceSet = require('./resourceset');
var Resource = require('./resource');

/**
 * Attachment (doclinks) object for Maximo OSLC API
 *
 * @constructor
 * @param {Object} Maximo Rest URL - e.g. http://maxadmin:maxadmin@localhost:7001
 */


function Attachment(member,meta,cookie)
{
 	this.member = member;
 	//this.currentResourceSet = collection["rdfs:member"];
 	this.resourceURI = (typeof(member)==="object")? getMyResourceURI(this.member) : member;
 	this.cookie = cookie;
 	this.name = meta.name;
 	this.description = meta.description;
 	this.type = meta.type;
 	this.contenttype = meta.contentype;
 	this.storeas = meta.storeas;
 	return this;
};


Attachment.prototype.JSON= function()
{
    //return this.idx < 0 ? this.currentResourceSet : this.currentResourceSet[this.idx];
    return this.member;
};



Attachment.prototype.create = function(buffer,datacallback)
{
	return createAttachment(buffer,this,datacallback);
};



// Private methods

function getMyResourceURI(member)
{
	// if rdf:resource is not available use rdf:about or href - one of them should definitely be available.
    var urltype = (typeof(member["rdf:about"] != "undefined") && member["rdf:about"] != null)
								? "rdf:about"
									: (typeof(member["rdf:resource"] != "undefined") && member["rdf:resource"] != null)
								        ? "rdf:resource"
								            : "href" ;
	return member[urltype];
}


function getHeaders(buffer,me)
{
	console.log("Content_Type **** "+me.contenttype);
	console.log("cookie **** "+me.cookie);
    return {/*'MAXAUTH': new Buffer(me.resourceURI.auth).toString('base64')*/
    		'Cookie' : me.cookie,
    			   'content-type': me.contenttype,
    			   'slug': me.name,
    			   'x-method-override': 'PATCH',
    			   'x-document-description': me.description,
    			   'x-document-meta':me.type+"/"+me.storeas
           }
}

function createAttachment(buffer,current,datacallback)
{
	var method = 'POST';
	var deferred = Q.defer();
	var returndata = '';
	var client = require(current.resourceURI.split(':')[0]);
	var host = current.resourceURI.split(':')[1].split("//")[1];
	var port = current.resourceURI.split(':')[2].split("/")[0];
	var path = current.resourceURI.split(host)[1].split(port)[1];
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
        headers: getHeaders(buffer,current),
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
		  		data = {"error code":res.statusCode,"description":"Required headers may not be set e.g. properties"};
		  		console.log("STATUS CODE: "+res.statusCode);
			  	var resourcemem = new Resource(data,current.cookie);
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


  req.write(buffer);
	req.end();
  //return this;
  return deferred.promise;
};
