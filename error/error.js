var assert = require('assert');
var util = require('util');
//var Error = require('error');

function InvalidArgumentError(message) {
 // Error.call(this);
 // this.message = message;
}

util.inherits(InvalidArgumentError, Error);

//assert(error.message);
//assert(error instanceof InvalidArgumentError);
//assert(error instanceof Error);