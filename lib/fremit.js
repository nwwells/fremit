'use strict';

var _ = require('lodash');
var defer = _.defer;
var get = _.get;
var set = _.set;
var clone = _.clone;
var isArray = _.isArray;

function Stream (fn) {
	this.isShared = false;
	this.callbackChain = [];
	this.chain = false;
	this.children = [];
	this.storedValues = [];
	if (fn) this.callbackChain.push(fn);
}

Stream.prototype.onNext = function (value) {
	if (this.chain) {
		this.chain(value);
	} else {
		//save up the values
		this.storedValues.push(value);
	}
};

Stream.prototype.share = function () {
	this.isShared = true;
	return this;
};

///////////////////////////////////////////////////////////////////////////////
// 
//  Link Appenders
//
///////////////////////////////////////////////////////////////////////////////
Stream.prototype.filter = function (fn) { 
	return this._appendLink(function (value, next) {
		if (fn(value) && next) { 
			next(value); 
		}
	});
};

Stream.prototype.map = function (fn) { 
	return this._appendLink(function (value, next) {
		value = fn(value);
		if (next) next(value);
	});
};

Stream.prototype.unwind = function (path) {
	return this._appendLink(function (value, next) {
		var list = get(value, path);
		if (!isArray(list)) {
			console.warn("used unwind on a non-array path! path:", path, "object:", value);
			next(value);
		} else {
			list.forEach(function (it) {
				var unwoundValue = clone(value);
				set(unwoundValue, path, it);
				next(unwoundValue);
			});
		}
	})
};

Stream.prototype.forEach = function (fn) { 
	return this._appendLink(function (value, next) {
		fn(value);
		if (next) next(value);
	});
};

// reduce -- merge together group of events
// slice  -- return a copy of this stream
// concat -- join two streams

Stream.prototype._appendLink = function (fn) {
	var self = this;
	var returnedStream;
	if (self.isShared) {
		var newChild = new Stream(fn);
		self.children.push(newChild);
		returnedStream = newChild;
	} else {
		self.callbackChain.push(fn);
		returnedStream = self;
	}

	//rebuild the chain
	var callbacks = self.callbackChain.slice();
	callbacks.push(function (value) {
		self.children.forEach( function (child) { child.onNext(value) });
	});
	self.chain = self._recursivelyConstructChain(callbacks.shift(), callbacks);
	// if there are any stored values, defer them running through the newly
	// built chain
	if (self.storedValues.length) {
		defer(function () {
			self.storedValues.forEach(function (value) { self.onNext(value) });
		});
	}

	//return either self or the newly created child;
	return returnedStream;
};

Stream.prototype._recursivelyConstructChain = function (current, callbacks) {
	// base case
	if (!callbacks || callbacks.length === 0) {
		return current;
	} else {
		//recurse
		var next = this._recursivelyConstructChain(callbacks.shift(), callbacks);
		return function (value) { current(value, next); };
	}
};

var mainStream = new Stream();

var enqueueFurtherEvents = false;
var emit = module.exports = function (event) {
	if (enqueueFurtherEvents) defer(() => emit(event));
	enqueueFurtherEvents = true;
	mainStream.onNext(event);
	enqueueFurtherEvents = false;
}

emit.stream = mainStream;
