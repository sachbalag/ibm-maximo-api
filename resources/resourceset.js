'use strict';
module.exports = ResourceSet;
var url = require('url');
var buffer = require('buffer');
var http   = require('http');
var Q = require('q');
var querystring = require("querystring");
var REST_PATH = '/maximo/oslc/os/';
var X_PUB_PATH = '/maximo/oslc/';
var REST_PATH = '/maximo/oslc/os/';

var Resource = require('./resource');
var FetchConnector = require('./connectors/fetchconnector');
var CRUDConnector = require('./connectors/crudconnector');
var ExternalConnector = require('./connectors/externalconnector');
var SchemaConnector = require('./connectors/schemaconnector');

/**
 * Business object for Maximo OSLC API
 *
 * @constructor
 * @param {Object} Maximo Rest URL - e.g. http://maxadmin:maxadmin@localhost:7001
 */


function ResourceSet(resourcemboset,cookie,maxfactory,mbo)
{
	this.cookie = cookie;
	// Since JavaScript does not support method/constructor overloading we have
 	// to handle multiple constructors by sniffing them out manually.

 	// Constructor 1
 	if(resourcemboset != null && cookie !== null)
 	{
 		//console.log("Instanciating Zombie Mbo Set - Constructor 1 ");
	 	this.resourcemboset = resourcemboset;
	 	return this;
	}
 	// Constructor 2
 	if(maxfactory != "undefined" && mbo != "undefined")
 	{
		X_PUB_PATH = maxfactory.auth_scheme + '/oslc/';
		REST_PATH = X_PUB_PATH + 'os/';

	 	this.maximoRestUrl = maxfactory.resturl;
	 	this.password = maxfactory.password;
	 	this.mbo = mbo;
	 	this.islean = maxfactory.islean;
	 	console.log("this.islean ****** "+this.islean);
	 	this.namespace = this.islean == 1 ? "" : "spi:";
	 	this.tenantcode = maxfactory.tenantcode;
	 	this.maximopath = REST_PATH+this.mbo+"?lean="+this.islean;
	 	this.maximopath = this.tenantcode ? this.maximopath+"&_tenantcode="+this.tenantcode : this.maximopath;
	 	this.schemapath = X_PUB_PATH + 'jsonschemas/'
	 	this.nextpageurl = "";
	 	this.authType = maxfactory.authType
	 	if(this.authType == "form")
	 	{
			this.fconnect = new FetchConnector(this.maximoRestUrl, this.maximopath);
			this.fconnect.authType = this.authType;
			this.fconnect.authenticate(this.fconnect);
	 	}

	 	return this;
	}
};

ResourceSet.prototype.cookie;

ResourceSet.prototype.fconnect;

//* Returns the rdfs member only
ResourceSet.prototype.thisResourceSet = function()
{
    return this.resourcemboset["member"];
};

//* Returns the complete JSON i.e all top level OR sets this set and returns the new set.
ResourceSet.prototype.JSON = function(resourcemboset)
{
	if (resourcemboset != null)
	{
		this.resourcemboset = resourcemboset;
	}
    return this.resourcemboset;
};



ResourceSet.prototype.fetch = function(datacallback)
{
	return getFetchConnector(this).__fetch(this.fconnect); // Pass this.fconnect so the it's state is updated.
}


ResourceSet.prototype.schema = function(datacallback)
{
	return getSchemaConnector(this).__fetch(this.sconnect); // Pass this.sconnect so the it's state is updated.
}

ResourceSet.prototype.schemarelated = function(datacallback)
{
	return getSchemaRelatedConnector(this).__fetch(this.sconnect); // Pass this.sconnect so the it's state is updated.
}


ResourceSet.prototype.nextpage = function(np,datacallback)
{
	return getFetchConnector(this).__fetchnext(np,this.fconnect); // Pass this.fconnect so the it's state is updated.
}


ResourceSet.prototype.resource = function(i)
{
	//console.log("Index type "+typeof(i));

	var connex = (this.cookie ? this.cookie : this.maximoRestUrl);
	if(typeof(i) === "number") //Strictly a number type and we assume this set contains members
	{
		return new Resource(this.resourcemboset["rdfs:member"][i],this.cookie);
	}
	//console.log("THIS COOKIE "+this.maximoRestUrl);
	//console.log("THIS COOKIE "+i);
	//console.log("CONNEX: "+connex);
	//console.log("CONNEX: "+typeof(connex));
	// Most likely a URL so we will have to fetch/update/delete/invoke
	var res = new Resource(i,connex);
	if(this.cookie)
	{
		res.setcookie(this.cookie);
	}
    return res;

};


ResourceSet.prototype.size = function()
{
    return this.resourcemboset["rdfs:member"].length;
};


ResourceSet.prototype.select = function(selects)
{
	 if (selects && selects.constructor === Array)
	 {
	 	var arrayLength = selects.length;
	 	var selectStr = '';
	 	var relationships = {};
		for (var i = 0; i < arrayLength; i++) {
			var wh = selects[i];
			wh = (wh.indexOf(":") < 1) ? this.namespace+wh : wh  //prepend the name spaces
			/*if(wh.indexOf(".") > 1) // check if this attribute is a relationship and construct expression
			{
				var wharray = wh.split(".");
				//wh = wharray[0]+"{"+this.namespace+wharray[1]+"}";

				relatedset(wharray[0],this.namespace+wharray[1],relationships);
			}*/
		    selectStr = ((arrayLength - i) > 1) ? selectStr+wh+"," : selectStr+wh;
		}
	 }
	this.select = selectStr+relationshipString(relationships);
	if(this.select != null && this.select != "")
	{
		this.maximopath = getMaximoPath(this.maximopath)+"oslc.select="+encodeURIComponent(this.select);
	}
	return this;
}


ResourceSet.prototype.where = function(prop)
{
	this.where = (prop.indexOf(":") < 1) ? this.namespace+prop : prop
	//this.where = prop;
	if(this.where != null && this.where != "")
	{
		this.maximopath = (this.maximopath.indexOf("oslc.where=") > -1)
										? getMaximoPath(this.maximopath)+"and"+encodeURIComponent(this.where)
										:  getMaximoPath(this.maximopath)+"oslc.where="+encodeURIComponent(this.where);
	}
	return this;
}


ResourceSet.prototype.and = function(str)
{
	str = (str.indexOf(":") < 1) ? this.namespace+str : str
	this.maximopath = this.maximopath+encodeURIComponent(" and ")+encodeURIComponent(str);

	return this;
}

ResourceSet.prototype.in = function(inarr,isint)
{
	if (inarr && inarr.constructor === Array)
	{
		var arrayLength = inarr.length;
	 	var inarrStr = '';
		for (var i = 0; i < arrayLength; i++) {
			var inElement = inarr[i];
		    //inarrStr = ((arrayLength - i) > 1) ? inarrStr+'"'+inElement+'",' : inarrStr+'"'+inElement+'"';
		    inarrStr = isint ? (((arrayLength - i) > 1) ? inarrStr+inElement+',' : inarrStr+inElement)
		    				 : (((arrayLength - i) > 1) ? inarrStr+'"'+inElement+'",' : inarrStr+'"'+inElement+'"');
		}
	}
    this.maximopath = this.maximopath+encodeURIComponent(" in["+inarrStr+"]");
	return this;
}

ResourceSet.prototype.equal = function(eq)
{
	if(this.where != null && this.where != "")
	{
		//.where("spi:status").equal('"APPR"')
		eq = (typeof(eq) === "string") ? '"'+eq+'"' : eq;
		this.maximopath = this.maximopath+"="+encodeURIComponent(eq);
	}
	return this;
}

ResourceSet.prototype.notnull = function(eq)
{
	if(this.where != null && this.where != "")
	{
		var eq = '*';
		eq = (typeof(eq) === "string") ? '"'+eq+'"' : eq;
		this.maximopath = this.maximopath+"="+encodeURIComponent(eq);
	}
	return this;
}

ResourceSet.prototype.orderby = function(oby,direction)
{
	if(this.where != null && this.where != "")
	{
		oby = (oby.indexOf(":") < 1) ? this.namespace+oby : oby
		var ascending = direction == 'desc'? 0 : 1
		oby = ascending ? "+"+oby : "-"+oby;
		this.maximopath = this.maximopath+"&oslc.orderBy="+encodeURIComponent(oby);
	}
	return this;
}

ResourceSet.prototype.pagesize = function(pagesize)
{
	this.pagesize = pagesize;
	if(this.pagesize != null && this.pagesize != "")
	{
		this.maximopath = getMaximoPath(this.maximopath)+"oslc.pageSize="+encodeURIComponent(this.pagesize);
	}
	return this;
}

ResourceSet.prototype.action = function(action)
{
	this.action = action;
	return this;
}

// TODO: Refactor invoke to Resource
ResourceSet.prototype.invoke = function(resource,datacallback)
{
	var myurl = resource["url"];
	var status = resource["status"];
	var memo = resource["memo"];
	var action = resource["action"];

	myurl = myurl+"?action=wsmethod:"+this.action;
	var purl = url.parse(myurl);

	console.log("URL: "+purl.hostname);
	console.log("URL: "+purl.port);
	console.log("URL: "+purl.path);

	var deferred = Q.defer();
	var returndata = '';
	var client = require(this.maximoRestUrl.protocol.split(':')[0]);
	var statusCode = "";
	var resourceset = "";
	var xpublicuri = this.maximoRestUrl.protocol+"//"+this.maximoRestUrl.hostname+":"+this.maximoRestUrl.port+X_PUB_PATH;

	var options = {
        hostname: purl.hostname,
        port: purl.port,
        headers: {'MAXAUTH': new Buffer(this.maximoRestUrl.auth).toString('base64'),
    			  'x-public-uri':xpublicuri.toString(),
    			  'x-method-override': 'PATCH',
    			   'content-type': 'application/json'},
        path: purl.path,
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
		  		console.log("RESDATA "+resdata);
			  	//var data = JSON.parse(resdata);
			  	statusCode = res.statusCode;
			  	if (datacallback)
			  	{
			  		deferred.promise.nodeify(datacallback(statusCode,resdata,this));
			  	} else
			  	{
			  		deferred.resolve(resdata);
			  	}
		  	//datacallback(response.statusCode,resourceset,this);  //Invoke the callback and pass the data back.
		   });
	});

    req.on('error', function(e)
    {
  		console.log('problem with request: ' + e.message);
	});


    req.write(JSON.stringify(resource));
	req.end();
  //return this;*/
  return deferred.promise;
}

ResourceSet.prototype.externalConnector = function(ops)
{
	return new ExternalConnector(ops,this.resourcemboset["member"]);
}


// CRUD starts here ...

ResourceSet.prototype.create = function(jsonbody,props,attachments,datacallback)
{
	return getCRUDConnector(this).__create(jsonbody,props,attachments,datacallback); // Pass this.fconnect so the it's state is updated.
}


//Private Methods


// Populates the JSON (relationships) with relationships and attributes
function relatedset(relname,attribute,relationships)
{
	var length = Object.keys(relationships).length;
	var attrs = null;
	if(length > 0) // the json is not empty
	{
		attrs = relationships[relname];
	}
	if(attrs == null) // the json is empty so pop in the first one.
	{
		relationships[relname] = [attribute];
	}else
	{
		attrs.push(attribute);
		relationships[relname] = attrs;
	}
	//console.log("******* "+JSON.stringify(relationships));
}

// Creates the relationship string
function relationshipString(relationships)
{
	var length = Object.keys(relationships).length;

	//spi:temeda{spi:event_description,spi:enginerpm,spi:idle_time_count}
	var relstr = "";

	for(var attribute in relationships)
	{
		relstr = relstr+","+attribute+"{"+relationships[attribute]+"}";
	}
	return relstr;
}


function getCRUDprops(props)
{
	return props.toString();
}

function getCRUDheaders(props,jsonbody,me,xmethod)
{
    var hdrs = null;
    var propsStr = getCRUDprops(props);
    if (propsStr)
    {
    	return {'MAXAUTH': new Buffer(me.maximoRestUrl.auth).toString('base64'),
    			   'content-type': 'application/json',
    			   'x-method-override': xmethod,
    			   'properties': propsStr,
    			   'body':JSON.stringify(jsonbody)}
    }
	return {'MAXAUTH': new Buffer(me.maximoRestUrl.auth).toString('base64'),
    			   'content-type': 'application/json',
    			   'x-method-override': xmethod,
    			   'body':JSON.stringify(jsonbody)}
}


function getMaximoPath(maxpath)
{
    return (maxpath.indexOf("?") < 1) ? maxpath+"?" : maxpath+"&";
}


function getFetchConnector(me)  // Singleton
{
	if(me.fconnect == null)
	{
		me.fconnect = new FetchConnector(me.maximoRestUrl, me.maximopath);
		me.fconnect.authType = me.authType;
		me.fconnect.cookie = me.cookie;
		me.fconnect.isCookieSet = me.cookie == null ? false : true;
	}
	return me.fconnect;
}

function getSchemaConnector(me)  // Singleton
{
	if(me.sconnect == null)
	{
		me.sconnect = new SchemaConnector(me.maximoRestUrl, me.schemapath+me.mbo);
		me.sconnect.authType = me.authType;
		me.sconnect.cookie = me.cookie;
		me.sconnect.isCookieSet = me.cookie == null ? false : true;
	}
	return me.sconnect;
}

function getSchemaRelatedConnector(me)  // Singleton
{
	if(me.sconnect == null)
	{
		me.sconnect = new SchemaConnector(me.maximoRestUrl, me.schemapath+me.mbo+"?oslc.select=*");
		me.sconnect.authType = me.authType;
		me.sconnect.cookie = me.cookie;
		me.sconnect.isCookieSet = me.cookie == null ? false : true;
	}
	return me.sconnect;
}

function getCRUDConnector(me)  // Singleton
{
	if(me.cconnect == null)
	{
		me.cconnect = new CRUDConnector(me.maximoRestUrl, me.maximopath);
		me.cconnect.authType = me.authType;
		me.cconnect.cookie = me.cookie;
		me.cconnect.isCookieSet = me.cookie == null ? false : true;
	}
	return me.cconnect;
}
