'use strict';

var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var amqplib = require('amqplib');
var Promise = require('bluebird');
var memoizee = require('memoizee');

module.exports = build;

function build (options) {
	var emitter = new EventEmitter();

	var config = {
		url: options && options.url || options,
		emitter: emitter
	};

	var getPublisher = memoizee(_.partial(createPublisher, config));
	var getSubscriber = memoizee(_.partial(createSubscriber, config));

	return _.merge(emitter, {
		publish: publishEvent,
		subscribe: listenForEvent,
		on: emitter.on
	});

	function publishEvent (eventName, eventData, context) {
		var ev = { context: this || context, data: eventData };
		return getPublisher(eventName).then(function (publisher) {
			return publisher(ev);
		});
	}

	function listenForEvent (eventName, listenerName, eventHandler) {
		return getSubscriber(eventName, listenerName).then(function (subscriber) {
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

function createSubscriber (config, eventName, listenerName) {
	var exchangeName = eventName;
	var queueName = [eventName, listenerName].join('-');
	return getChannel(config.url).then(function (channel) {
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
			return channel.consume(queueName, _.partial(onMessage, channel, config.emitter, exchangeName, listenerName, handler));
		};
	});
}

function onMessage (channel, emitter, exchangeName, listenerName, handler, message) {
	var content = JSON.parse(message.content.toString());
	return Promise.resolve(handler.call(content.context, content.data)).catch(function (error) {
		emitter.emit('error', {
			'event': exchangeName,
			listener: listenerName,
			data: message,
			error: error
		});
	}).finally(function () {
		return channel.ack(message);
	});
}

var getChannel = memoizee(createChannel);

function createChannel (url) {
	return amqplib.connect(url).then(function (connection) {
		return connection.createChannel();
	});
}
