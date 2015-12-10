var evque = require('./..');
var should = require('should');

describe('evque', function () {
	it('should work', function (done) {
		var bus = evque('amqp://localhost');
		bus.on('error', done);
		bus.subscribe('my-event', 'subscriber', function (ev) {
			ev.abba.should.eql('boney m');
			done();
		}).catch(done);
		bus.publish('my-event', { abba: 'boney m' }).catch(done);
	});
});
