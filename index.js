'use strict';

var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var Promise = require('bluebird');
var amqplib = require('amqplib');
var memoizee = require('memoizee');

module.exports = build;

function build (options) {
	var emitter = new EventEmitter();

	var config = {
		url: options && options.url || options,
		prefetch: options.prefetch || null,
		emitter: emitter
	};

	var getPublisher = memoizee(_.partial(createPublisher, config), { length: false });
	var getSubscriber = memoizee(_.partial(createSubscriber, config), { length: false });

	var api = _.extend(emitter, {
		publish: publishEvent,
		subscribe: listenForEvent
	});

	return api;

	function publishEvent (eventName, eventData, context) {
		var ev = { context: api === this ? context : context || this, data: eventData };
		return getPublisher(eventName).then(function (publisher) {
			return publisher(ev);
		});
	}

	function listenForEvent (eventName, listenerName, eventHandler, prefetchCount) {
		return getSubscriber(eventName, listenerName, prefetchCount).then(function (subscriber) {
			return subscriber(eventHandler);
		});
	}
}

function createPublisher (config, exchangeName) {
	return getChannel(config.url).then(function (channel) {
		return channel.assertExchange(exchangeName, 'fanout', { durable: true }).then(function () {
			return channel;
		});
	}).then(function (channel) {
		return function publish (message) {
			return channel.publish(exchangeName, 'anykey', new Buffer(JSON.stringify(message)), { persistent: true });
		};
	});
}

function createSubscriber (config, eventName, listenerName, prefetchCount) {
	var exchangeName = eventName;
	var queueName = [eventName, listenerName].join('-');
	return getChannel(config.url, prefetchCount || config.prefetch).then(function (channel) {
		return Promise.all([
			channel.assertExchange(exchangeName, 'fanout', { durable: true }),
			channel.assertQueue(queueName, { durable: true })
		]).then(function () {
			return channel.bindQueue(queueName, exchangeName, '*');
		}).then(function () {
			return channel;
		});
	}).then(function (channel) {
		return function subscribe (handler) {
			return channel.consume(queueName, onMessage);
			function onMessage (message) {
				var content = JSON.parse(message.content.toString());
				return Promise.resolve().then(function () {
					return handler.call(content.context, content.data);
				}).catch(function (error) {
					config.emitter.emit('error', {
						'event': exchangeName,
						listener: listenerName,
						data: content.data,
						context: content.context,
						error: error
					});
				}).finally(function () {
					return channel.ack(message);
				});
			}
		};
	});
}

var getChannel = memoizee(createChannel);

function createChannel (url, prefetchCount) {
	return amqplib.connect(url).then(function (connection) {
		return connection.createChannel();
	}).then(function (channel) {
		if (prefetchCount > 0) {
			channel.prefetch(prefetchCount);
		}
		return channel;
	});
}
