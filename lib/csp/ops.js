'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _index = require('../index');

var _utils = require('../utils');

var _utils2 = require('./utils');

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } } /* eslint-disable no-use-before-define, no-param-reassign */


var noop = function noop() {};
var ops = {};

// **************************************************** put

ops.sput = function sput(channels) {
  var item = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  var callback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : noop;

  channels = (0, _utils2.normalizeChannels)(channels);
  var result = channels.map(function () {
    return _index.NOTHING;
  });
  var setResult = function setResult(idx, value) {
    result[idx] = value;
    if (!result.includes(_index.NOTHING)) {
      callback(result.length === 1 ? result[0] : result);
    }
  };
  channels.forEach(function (channel, idx) {
    var chState = channel.state();
    if (chState !== _index.OPEN) {
      setResult(idx, chState);
    } else {
      channel.buff.put(item, function (putResult) {
        return setResult(idx, putResult);
      });
    }
  });
};
ops.put = function put(channels, item) {
  return { channels: channels, op: _index.PUT, item: item };
};

// **************************************************** take

ops.stake = function stake(channels, callback, options) {
  channels = (0, _utils2.normalizeChannels)(channels);
  options = (0, _utils2.normalizeOptions)(options);
  callback = (0, _utils2.normalizeTo)(callback);
  var unsubscribers = void 0;
  if (options.strategy === _index.ALL_REQUIRED) {
    var result = channels.map(function () {
      return _index.NOTHING;
    });
    var setResult = function setResult(idx, value) {
      result[idx] = value;
      if (!result.includes(_index.NOTHING)) {
        callback(result.length === 1 ? result[0] : [].concat(_toConsumableArray(result)));
      }
    };
    unsubscribers = channels.map(function (channel, idx) {
      var chState = channel.state();
      if (chState === _index.ENDED) {
        setResult(idx, chState);
      } else if (chState === _index.CLOSED && channel.buff.isEmpty()) {
        channel.state(_index.ENDED);
        setResult(idx, _index.ENDED);
      } else {
        return channel.buff.take(function (takeResult) {
          return setResult(idx, takeResult);
        }, options);
      }
    });
  } else if (options.strategy === _index.ONE_OF) {
    var done = function done() {
      // This function is here to clean up the unresolved buffer readers.
      // In the ONE_OF strategy there are pending readers that should be
      // killed since one of the others in the list is called. And this
      // should happen only if we are not listening.
      if (!options.listen) {
        unsubscribers.filter(function (f) {
          return f;
        }).forEach(function (f) {
          return f();
        });
      }
      callback.apply(undefined, arguments);
    };
    unsubscribers = channels.map(function (channel, idx) {
      var chState = channel.state();
      if (chState === _index.ENDED) {
        done(chState, idx);
      } else if (chState === _index.CLOSED && channel.buff.isEmpty()) {
        channel.state(_index.ENDED);
        done(_index.ENDED, idx);
      } else {
        return channel.buff.take(function (takeResult) {
          return done(takeResult, idx);
        }, options);
      }
    });
  } else {
    throw new Error('Unrecognized strategy "' + options.strategy + '"');
  }
  return function unsubscribe() {
    unsubscribers.filter(function (f) {
      return f;
    }).forEach(function (f) {
      return f();
    });
  };
};
ops.take = function take(channels, options) {
  return { channels: channels, op: _index.TAKE, options: options };
};

// **************************************************** read

ops.read = function read(channels, options) {
  return { channels: channels, op: _index.READ, options: _extends({}, options, { read: true }) };
};
ops.sread = function sread(channels, to, options) {
  return ops.stake(channels, to, _extends({}, options, { read: true }));
};
ops.unsubAll = function unsubAll(channel) {
  channel.buff.deleteListeners();
};

// **************************************************** listen

ops.listen = function listen(channels, to, options) {
  return ops.stake(channels, to, _extends({}, options, { listen: true }));
};

// **************************************************** close, reset, call, fork, merge, timeout, isChannel

ops.close = function close(channels) {
  channels = (0, _utils2.normalizeChannels)(channels);
  channels.forEach(function (ch) {
    var newState = ch.buff.isEmpty() ? _index.ENDED : _index.CLOSED;
    ch.state(newState);
    ch.buff.puts.forEach(function (p) {
      return p.callback(newState);
    });
    ch.buff.deleteListeners();
    ch.buff.takes.forEach(function (t) {
      return t.callback(newState);
    });
    _index.grid.remove(ch);
    _index.CHANNELS.del(ch.id);
    _index.logger.log(ch, 'CHANNEL_CLOSED');
  });
  return { op: _index.NOOP };
};
ops.sclose = function sclose(id) {
  return ops.close(id);
};
ops.channelReset = function channelReset(channels) {
  channels = (0, _utils2.normalizeChannels)(channels);
  channels.forEach(function (ch) {
    ch.state(_index.OPEN);
    ch.buff.reset();
    _index.logger.log(ch, 'CHANNEL_RESET');
  });
  return { op: _index.NOOP };
};
ops.schannelReset = function schannelReset(id) {
  ops.channelReset(id);
};
ops.call = function call(routine) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  return { op: _index.CALL_ROUTINE, routine: routine, args: args };
};
ops.fork = function fork(routine) {
  for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    args[_key2 - 1] = arguments[_key2];
  }

  return { op: _index.FORK_ROUTINE, routine: routine, args: args };
};
ops.merge = function merge() {
  var newCh = (0, _index.chan)();

  for (var _len3 = arguments.length, channels = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    channels[_key3] = arguments[_key3];
  }

  channels.forEach(function (ch) {
    (function taker() {
      ops.stake(ch, function (v) {
        if (v !== _index.CLOSED && v !== _index.ENDED && newCh.state() === _index.OPEN) {
          ops.sput(newCh, v, taker);
        }
      });
    })();
  });
  return newCh;
};
ops.timeout = function timeout(interval) {
  var ch = (0, _index.chan)();
  setTimeout(function () {
    return ops.close(ch);
  }, interval);
  return ch;
};
ops.isChannel = function (ch) {
  return ch && ch['@channel'] === true;
};
ops.isRiew = function (r) {
  return r && r['@riew'] === true;
};
ops.isState = function (s) {
  return s && s['@state'] === true;
};
ops.isRoutine = function (r) {
  return r && r['@routine'] === true;
};
ops.verifyChannel = function verifyChannel(ch) {
  var throwError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

  if (ops.isChannel(ch)) return ch;
  if (throwError) {
    throw new Error('' + ch + (typeof ch !== 'undefined' ? ' (' + (typeof ch === 'undefined' ? 'undefined' : _typeof(ch)) + ')' : '') + ' is not a channel.' + (typeof ch === 'string' ? ' Did you forget to define it?\nExample: chan("' + ch + '")' : ''));
  }
  return null;
};

// **************************************************** go/routine

ops.go = function go(func) {
  var done = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};
  var args = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  var parent = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

  var RUNNING = 'RUNNING';
  var STOPPED = 'STOPPED';
  var state = RUNNING;
  var name = (0, _utils.getFuncName)(func);

  var api = {
    id: (0, _utils.getId)('routine_' + name),
    '@routine': true,
    parent: parent,
    name: name,
    children: [],
    stop: function stop() {
      state = STOPPED;
      this.children.forEach(function (r) {
        return r.stop();
      });
      _index.grid.remove(api);
      _index.logger.log(api, 'ROUTINE_STOPPED');
    },
    rerun: function rerun() {
      gen = func.apply(undefined, _toConsumableArray(args));
      next();
      _index.logger.log(this, 'ROUTINE_RERUN');
    }
  };
  var addSubRoutine = function addSubRoutine(r) {
    return api.children.push(r);
  };

  _index.logger.log(api, 'ROUTINE_STARTED');
  var gen = func.apply(undefined, _toConsumableArray(args));

  function processGeneratorStep(i) {
    switch (i.value.op) {
      case _index.PUT:
        ops.sput(i.value.channels, i.value.item, next);
        break;
      case _index.TAKE:
        ops.stake(i.value.channels, function () {
          for (var _len4 = arguments.length, nextArgs = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
            nextArgs[_key4] = arguments[_key4];
          }

          next(nextArgs.length === 1 ? nextArgs[0] : nextArgs);
        }, i.value.options);
        break;
      case _index.NOOP:
        next();
        break;
      case _index.SLEEP:
        setTimeout(next, i.value.ms);
        break;
      case _index.STOP:
        api.stop();
        break;
      case _index.READ:
        ops.sread(i.value.channels, next, i.value.options);
        break;
      case _index.CALL_ROUTINE:
        addSubRoutine(ops.go(i.value.routine, next, i.value.args, api.id));
        break;
      case _index.FORK_ROUTINE:
        addSubRoutine(ops.go(i.value.routine, function () {}, i.value.args, api.id));
        next();
        break;
      default:
        throw new Error('Unrecognized operation ' + i.value.op + ' for a routine.');
    }
  }

  function next(value) {
    if (state === STOPPED) return;
    var step = gen.next(value);
    if (step.done === true) {
      if (done) done(step.value);
      if (step.value && step.value['@go'] === true) {
        api.rerun();
      } else {
        _index.grid.remove(api);
        _index.logger.log(api, 'ROUTINE_END');
      }
    } else if ((0, _utils.isPromise)(step.value)) {
      _index.logger.log(api, 'ROUTINE_ASYNC_BEGIN');
      step.value.then(function () {
        _index.logger.log(api, 'ROUTINE_ASYNC_END');
        next.apply(undefined, arguments);
      }).catch(function (err) {
        _index.logger.log(api, 'ROUTINE_ASYNC_ERROR', err);
        processGeneratorStep(gen.throw(err));
      });
    } else {
      processGeneratorStep(step);
    }
  }

  _index.grid.add(api);
  next();

  return api;
};
ops.go['@go'] = true;
ops.go.with = function () {
  for (var _len5 = arguments.length, maps = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
    maps[_key5] = arguments[_key5];
  }

  var reducedMaps = maps.reduce(function (res, item) {
    if (typeof item === 'string') {
      res = _extends({}, res, _defineProperty({}, item, (0, _index.use)(item)));
    } else {
      res = _extends({}, res, item);
    }
    return res;
  }, {});
  return function (func) {
    for (var _len6 = arguments.length, args = Array(_len6 > 2 ? _len6 - 2 : 0), _key6 = 2; _key6 < _len6; _key6++) {
      args[_key6 - 2] = arguments[_key6];
    }

    var done = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};

    args.push(reducedMaps);
    return ops.go(func, done, args);
  };
};

ops.sleep = function sleep(ms, callback) {
  if (typeof callback === 'function') {
    setTimeout(callback, ms);
  } else {
    return { op: _index.SLEEP, ms: ms };
  }
};

ops.stop = function stop() {
  return { op: _index.STOP };
};

exports.default = ops;