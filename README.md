# evque

Event bus implemented using amqp exchanges (events) and queues (listeners).

# Description

Each `event` = `exchange` of `fanout` type, named after event.
Each `subscriber` = `queue` bound to `exchange`, named after event and subscriber.

![Diagram](diagram.png)

# Motivation

- events are preserved across broker restarts
- events will wait for their listeners (will not disappear if listener offline)

# Example

```js
var bus = require('evque')('amqp://localhost');
bus.on('error', function (ev) {
	console.log('listener %s failed to handle event %s (%j) due to %s', ev.listener, ev['event'], ev.data, ev.error.stack);
});
bus.subscribe('event1', 'listener1', function (data) {
	console.log('listener1 received event1 (%j)', data);
});
bus.subscribe('event1', 'listener2', function (data) {
	console.log('listener2 received event1 (%j)', data);
});
bus.publish('event1', { a: 'b' });
```

# License

MIT
