'use strict';
module.exports = ResourceObject;

var ResourceSet = require('./resourceset');



/**
 * Business object for Maximo OSLC API
 *
 * @constructor
 * @param {Object} Maximo Rest URL - e.g. http://maxadmin:maxadmin@localhost:7001
 */


function ResourceObject(maxfactory,mbo)
{
 	//Return a Zombie set.
 	var cookie = maxfactory.isCookieSet ? maxfactory.cookie["set-cookie"] : null;
 	return new ResourceSet(null,cookie,maxfactory,mbo);
};


ResourceObject.prototype.name = function()
{
    return this.mbo;
};
