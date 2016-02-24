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
		}).catch(done).then(function () {
			bus.publish('my-event', { abba: 'boney m' }).catch(done);
		});
	});

	it('should work with specified prefetch', function (done) {
		var bus = evque('amqp://localhost');
		bus.on('error', done);
		
		var callsCounter = 0;
		var activeHandlersCounter = 0;

		bus.subscribe('prefetch-event', 'subscriber', function (ev) {
			return new Promise(function (resolve, reject) {
				if (++activeHandlersCounter > 5) {
					done(new Error('called 6th time before any of previous 5 calls has finished'));
				}
				setTimeout(function () {
					activeHandlersCounter--;
					resolve();
					if (++callsCounter == 6) {
						done();
					}
				}, 300);
			});
		}, 5).catch(done).then(function () {
			bus.publish('prefetch-event', { abba: 'boney m' }).catch(done);
			bus.publish('prefetch-event', { abba: 'boney m' }).catch(done);
			bus.publish('prefetch-event', { abba: 'boney m' }).catch(done);
			bus.publish('prefetch-event', { abba: 'boney m' }).catch(done);
			bus.publish('prefetch-event', { abba: 'boney m' }).catch(done);
			bus.publish('prefetch-event', { abba: 'boney m' }).catch(done);
		});
	});
});
