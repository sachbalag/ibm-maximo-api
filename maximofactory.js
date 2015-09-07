
'use strict';

module.exports = MaximoFactory;

var ResourceObject = require('./resources/resourceobject');

var InvalidArgumentError = require('./error/error');
var events = require('events');
var url = require('url');
var AuthConnector = require('./resources/connectors/authconnector');

/**
 * Creates an object for exposing Maximo OSLC API
 *
 * @constructor
 * @param {Object} Maximo Rest URL - e.g. http://maxadmin:maxadmin@localhost:7001
 */
function MaximoFactory(options,cookie,callback)
{
	this.protocol = options.protocol;
	this.hostname = options.hostname;
	this.port = options.port;
 	this.user = options.user;
 	this.password = options.password;
 	this.islean = 0;
 	this.tenantcode = options.tenantcode;
 	this.auth_scheme = options.auth_scheme;
 	this.authType = options.authtype;
 	this.cookie = cookie;
 	this.isCookieSet = this.cookie ? true : false;

 	if(this.authType && this.authType == "form")
 	{
 		this.authPath = this.auth_scheme+"/j_security_check";
 	}


 	if(options.islean != null)
 	{
 		this.islean = options.islean;
 	}

 	console.log("### islean "+this.islean);

 	this.resturl = url.parse(this.protocol+"://"+this.user+":"+this.password+"@"+this.hostname+":"+this.port);

 	if(callback != null)
 	{
		if(this.hostname === "" || this.user === "" || this.password === "")
		{
			callback(new Error("Invalid null arguments.",""));
		}
	}
	return this;
}

MaximoFactory.prototype.authenticate = function()
{
	this.authC = new AuthConnector(this.resturl);
	this.authC.authType = this.authType;
    return this.authC.authenticate(this.authC);
};


MaximoFactory.prototype.resourceobject = function(mbo)
{
    //return new ResourceSet(this.resturl,this.user,this.password,mbo);
    return new ResourceObject(this,mbo);
};

MaximoFactory.prototype.publicuri = function()
{
    return this.hostname;
};

MaximoFactory.prototype.user = function()
{
    return this.user;
};

MaximoFactory.prototype.isCookieSet;
