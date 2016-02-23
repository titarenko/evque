var Promise = require('bluebird');
var evque = require('../');
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

	it('should work with specified prefetch', function (done) {
		var bus = evque('amqp://localhost');
		bus.on('error', done);

		var counter = 0;

		bus.subscribe('prefetch-event', 'subscriber', function (ev) {
			return new Promise(function (resolve, reject) {
				counter++;
				setTimeout(function () {
					resolve();
				}, 300);
			});
		}, 5).catch(done);

		// At this moment there should be only 5 messages in progress
		setTimeout(function () {
			counter.should.be.equal(5);
		}, 200);

		setTimeout(function () {
			counter.should.be.equal(6);
		}, 350);

		// Give last ack some time to be delivered
		setTimeout(function () {
			done();
		}, 650);

		bus.publish('prefetch-event', { abba: 'boney m' }).catch(done);
		bus.publish('prefetch-event', { abba: 'boney m' }).catch(done);
		bus.publish('prefetch-event', { abba: 'boney m' }).catch(done);
		bus.publish('prefetch-event', { abba: 'boney m' }).catch(done);
		bus.publish('prefetch-event', { abba: 'boney m' }).catch(done);
		bus.publish('prefetch-event', { abba: 'boney m' }).catch(done);
	})
});
