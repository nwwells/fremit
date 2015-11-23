frēmit
======

An FRP-style event-stream-to-collections interface toolkit

Here's the basic idea. Your application can be expressed as
a series of reactions to inputs or events. This is the idea 
behind [event-driven programming](1). The idea behind this 
library is to organize your program in such a way that 
tracing the reaction to events becomes _possible_ if not
**trivial**.

[1]: https://en.wikipedia.org/wiki/Event-driven_programming

Example
-------

Let's illustrate. "Hello World!" is always convenient:

```html
<body>
	<button class="hello">Hello, Computer!</button>
</body>
```

```javascript
import emit from 'fremit';
// this is the singleton stream that is the embodiment of 
// how our app responds to events
const stream = emit.stream.share()

window.addEventListener('click', emit);
//ideally you'd listen for all events on window and/or document

stream
    .filter(e => e.target.classList.contains('hello'))
    .forEach(e => alert('Hello, Person!'));
```

It should be pretty clear how to use the `stream`. There are 
more details on [the API below](#API). It's an explicit 
design decision to **allow one `stream` per app**. This is a
core difference between this library and [RxJS](2).

[2]: https://github.com/Reactive-Extensions/RxJS

The other half of this library is how to use `emit`. One 
should use `emit` to publish system events such as user 
input or messages received from the server to the stream. It
is __the__ integration point for frēmit. The interface is
simple: one function, one argument. The argument is an event
object, which usually has a `type` property to allow 
differentiation in the stream handler.

Here's an (rather long-ish) example for AJAX (assuming a DOM 
with the right stuff in it): 

```javascript
import $ from 'jquery';
import emit from 'fremit';
// this is the singleton stream that is the embodiment of 
// how our app responds to events
const stream = emit.stream.share()

// Register a handler to be called when the first Ajax request begins. This is an Ajax Event.
$(document).ajaxStart(() => emit({type: 'jqXHRStart'}));

// Attach a function to be executed before an Ajax request is sent. This is an Ajax Event.
$(document).ajaxSend((event, jqXHR, ajaxOptions) => emit({
    event, jqXHR, ajaxOptions, type: 'jqXHRSend'
}));

// Attach a function to be executed whenever an Ajax request completes successfully. This is an Ajax Event.
$(document).ajaxSuccess((event, jqXHR, ajaxOptions, data) => emit({
    event, jqXHR, ajaxOptions, data, type: 'jqXHRSuccess'
}));

// Register a handler to be called when Ajax requests complete with an error. This is an Ajax Event.
$(document).ajaxError((event, jqXHR, ajaxOptions, thrownError) => emit({
    event, jqXHR, ajaxOptions, thrownError, type: 'jqXHRError'
}));

// Register a handler to be called when Ajax requests complete. This is an AjaxEvent.
$(document).ajaxComplete((event, jqXHR, ajaxOptions) => emit({
    event, jqXHR, ajaxOptions, type: 'jqXHRComplete'
}));

// Register a handler to be called when all Ajax requests have completed. This is an Ajax Event.
$(document).ajaxStop(() => emit({type: 'jqXHRStop'}));



////////////////////////////////////////////////////////
//
// The stream part
//
//

stream
    .filter(e => e.type === 'jqXHRStart')
    .forEach(e => $('.loading').show());

stream
    .filter(e => e.type === 'jqXHRStop')
    .forEach(e => $('.loading').hide());

stream
    .filter(e => e.type === 'jqXHRSuccess' || e.type === 'jqXHRError')
    .forEach(e => {
        //do something to handle success and errors...
        pushDataIntoStore(e.data || e.thrownError);
        queueRender();
    });

// We don't currently do anything with Send or Complete...   
// stream
//    .filter(e => e.type === 'jqXHRSend')
// stream
//    .filter(e => e.type === 'jqXHRComplete')

```

Note the general emphasis on listening for global events,
rather than listening to particular requests or to 
particular DOM elements.

API
---
API documentation is currently a work in progress... bare
with me.

#### .share()
Share this stream, which means that any further handlers 
attached to this stream will create new child streams, 
rather than returning this one. This makes the branching
builder-style approach seen above possible.

If you don't `share` the stream, any handlers you attach will
return a reference to this stream, which means that if you
filter events, they will be filtered from the rest of the
handlers.

This makes an interesting use case possible that I'll 
explain later.

#### .filter (fn(event))
Return true from your `fn` if handlers later in the stream
should handle this event.

#### .map (fn(event))
return an object that is a function of the event, and 
handlers further down the stream will make use of the
newly returned object.

#### .unwind (path)
Looks for an array at the specified `path`, creates a new
cloned event for each element of the array and pushes them
further into the stream.

See [MongoDB's definition of `$unwind`](3), and [lodash's definition of `path`](4)

[3]: https://docs.mongodb.org/manual/reference/operator/aggregation/unwind/
[4]: https://lodash.com/docs#get

#### .forEach (fn(event))
Calls the given function for any event. This is your
imperative release valve if you need it.


Roadmap
-------

* __0.1__: Get it out there. Get some commentary
* __0.5__: Make any essential interface changes, get more commentary
* __0.9__: Incorporate all feedback, release-candidate level quality for docs and testing
* __1.0__: Full release, production ready. No more API changes
* __1.x__: Add additional handlers as needed or convenient
* __2.0__: (Hopefully not necessary) Any additional API changes. Semver FTW, baby!

