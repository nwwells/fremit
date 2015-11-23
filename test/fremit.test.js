
var _ = require('lodash');
var expect = require('expect.js');

var emit = require('../lib/fremit');
var stream = emit.stream;

resetFremit = function () {
	stream.isShared = false;
	stream.callbackChain = [];
	stream.chain = false;
	stream.children = [];
	stream.storedValues = [];
};

describe('fremit', function () {
	beforeEach(function () {
		resetFremit();
	});

	it('should stream events emitted', function (done) {
		var actualEvent, sentEvent = { an: 'event' };
		stream.forEach(function (actualEvent) {
			expect(actualEvent).to.eql(sentEvent);
			done();
		});
		emit(sentEvent);
	});
});