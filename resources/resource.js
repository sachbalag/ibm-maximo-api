'use strict';
module.exports = Resource;
var url = require('url');
var buffer = require('buffer');
var http   = require('http');
var REST_PATH = '/maximo/oslc/os/';
var X_PUB_PATH = '/maximo/oslc/';
var Q = require('q');
var ResourceSet = require('./resourceset');
var Attachment = require('./attachment');
var CRUDConnector = require('./connectors/crudconnector');
var twilio = require('twilio');

/**
 * Business object for Maximo OSLC API
 *
 * @constructor
 * @param {Object} Maximo Rest URL - e.g. http://maxadmin:maxadmin@localhost:7001
 */


function Resource(member,connection)
{
 	this.member = member;
 	//this.currentResourceSet = collection["rdfs:member"];
 	this.resourceURI = (typeof(member)==="object")? getMyResourceURI(this.member) : member;
 	//this.currentResourceSet = (typeof(collection["rdfs:member"]) == "undefined") ? collection: collection["rdfs:member"];
 	console.log("connection type "+typeof(connection));
 	console.log("connection "+connection);
 	this.isCookieSet = false;
 	//fyi... if this.isCookieSet = true (set by the client) then the connection will be a cookie
 	//       otherwise it's a URL
 	this.connection = connection;
 	return this;
};

Resource.prototype.isCookieSet;

Resource.prototype.setcookie= function(cookie)
{
	this.cookie = cookie;
	this.isCookieSet = true;
}

Resource.prototype.JSON= function()
{
    //return this.idx < 0 ? this.currentResourceSet : this.currentResourceSet[this.idx];
    return this.member;
};


Resource.prototype.relatedResource = function(relation)
{
	this.relation = relation;
	this.resourceURI = getMyResourceURI(this.member[relation]);
	return this;
};

Resource.prototype.properties = function(props)
{
	this.resourceURI += "?oslc.properties="+props.toString();
	return this;
};

Resource.prototype.attachment = function(meta,datacallback)
{
	return new Attachment(this.member,meta,this.connection);
};

Resource.prototype.twilio_message = function(res)
{
  var client = new twilio.RestClient('ACdf313fd7f66eb3674000e60dca2b2672', 'e4b02903fad59b943423fdb1a43007ee');

    var toadd = '+1 508-577-3979';
    var msgbody = "This is a message from the Maximo Bluemix API - Your Tesla Model S is at a 50% charge state " +
     "with the battery level state at 50%  " +
     "and an estimate range of 120 miles"
    client.sendMessage({
        to:toadd,
        from:'+1 508-232-4376',
        body:msgbody
    }, function(err, message)
    {
        console.log(JSON.stringify(message));
        if(err == null)
        {
          res.send('Message sent! ID: '+message.sid);
        } else
        {
           var errmsg = "Status: "+err.status+" Message: "+err.message+" Code: "+err.code+" More Info: "+err.moreInfo;
           res.send(errmsg);
        }
    });
};

Resource.prototype.update = function(jsonbody,props,datacallback)
{
	return getCRUDConnector(this).__crud(jsonbody,props,this,'POST','PATCH','MERGE',datacallback);
	//return crud(jsonbody,props,this,'POST',null,datacallback);
};

Resource.prototype.merge = function(jsonbody,props,datacallback)
{
	var patchtype = "MERGE";
	return crud(jsonbody,props,this,'POST',patchtype,datacallback);
};

Resource.prototype.delete = function(jsonbody,props,datacallback)
{
	var patchtype = "MERGE";
	return getCRUDConnector(this).__crud(jsonbody,props,this,'DELETE',null,null,datacallback);
	//return crud(jsonbody,props,this,'DELETE',null,datacallback);
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

function getCRUDConnector(me)  // Singleton
{
	if(me.cconnect == null)
	{
		me.cconnect = new CRUDConnector(me.resourceURI, me.maximopath);
		me.cconnect.authType = me.authType;
		me.cconnect.cookie = me.cookie;
		console.log("^^^%^%^^%^%^ me.cookie "+me.cookie);
		me.cconnect.isCookieSet = me.cookie == null ? false : true;
	}
	return me.cconnect;
}
