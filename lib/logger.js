'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Logger;

var _index = require('./index');

var _sanitize = require('./sanitize');

var _sanitize2 = _interopRequireDefault(_sanitize);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable no-use-before-define */
var RIEW = 'RIEW';
var STATE = 'STATE';
var CHANNEL = 'CHANNEL';
var ROUTINE = 'ROUTINE';

function normalizeRiew(r) {
  return {
    id: r.id,
    name: r.name,
    type: RIEW,
    viewData: (0, _sanitize2.default)(r.renderer.data()),
    children: r.children.map(function (child) {
      if ((0, _index.isState)(child)) {
        return normalizeState(child);
      }
      if ((0, _index.isChannel)(child)) {
        return normalizeChannel(child);
      }
      if ((0, _index.isRoutine)(child)) {
        return normalizeRoutine(child);
      }
      console.warn('Riew logger: unrecognized riew child', child);
    })
  };
}
function normalizeState(s) {
  return {
    id: s.id,
    name: s.name,
    parent: s.parent,
    type: STATE,
    value: (0, _sanitize2.default)(s.get()),
    children: s.children().map(function (child) {
      if ((0, _index.isChannel)(child)) {
        return normalizeChannel(child);
      }
      console.warn('Riew logger: unrecognized state child', child);
    })
  };
}
function normalizeChannel(c) {
  var o = {
    id: c.id,
    name: c.name,
    parent: c.parent,
    type: CHANNEL,
    value: (0, _sanitize2.default)(c.value()),
    puts: c.buff.puts.map(function (_ref) {
      var item = _ref.item;
      return { item: item };
    }),
    takes: c.buff.takes.map(function (_ref2) {
      var options = _ref2.options;
      return {
        read: options.read,
        listen: options.listen
      };
    })
  };
  return o;
}
function normalizeRoutine(r) {
  return {
    id: r.id,
    type: ROUTINE,
    name: r.name,
    parent: r.parent
  };
}

function Logger() {
  var api = {};
  var frames = [];
  var data = [];
  var inProgress = false;
  var enabled = false;
  var listeners = [];

  api.on = function (listener) {
    return listeners.push(listener);
  };
  api.log = function (who, what, meta) {
    if (!enabled) return null;
    if ((0, _index.isRiew)(who)) {
      who = normalizeRiew(who);
    } else if ((0, _index.isState)(who)) {
      who = normalizeState(who);
    } else if ((0, _index.isChannel)(who)) {
      who = normalizeChannel(who);
    } else if ((0, _index.isRoutine)(who)) {
      who = normalizeRoutine(who);
    } else {
      console.warn('Riew logger: unrecognized who', who, what);
    }
    data.push({
      who: who,
      what: what,
      meta: (0, _sanitize2.default)(meta)
    });
    if (!inProgress) {
      inProgress = true;
      Promise.resolve().then(function () {
        var s = api.frame(data);
        inProgress = false;
        data = [];
        listeners.forEach(function (l) {
          return l(s);
        });
      });
    }
  };
  api.frame = function (actions) {
    if (!enabled) return null;
    var frame = (0, _sanitize2.default)(actions);
    frames.push(frame);
    return frame;
  };
  api.now = function () {
    return frames.length > 0 ? frames[frames.length - 1] : null;
  };
  api.frames = function () {
    return frames;
  };
  api.reset = function () {
    frames = [];
    enabled = false;
  };
  api.enable = function () {
    enabled = true;
  };
  api.disable = function () {
    enabled = false;
  };
  api.setWhoName = function (id, name) {
    data.forEach(function (action) {
      if (action.who.id === id) {
        action.who.name = name;
      }
    });
    frames.forEach(function (frame) {
      frame.forEach(function (action) {
        if (action.who.id === id) {
          action.who.name = name;
        }
      });
    });
  };

  return api;
}