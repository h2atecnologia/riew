'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.default = connect;

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _fastDeepEqual = require('fast-deep-equal');

var _fastDeepEqual2 = _interopRequireDefault(_fastDeepEqual);

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function isRineState(value) {
  return value.__rine === 'state';
}
function getValueFromState(state) {
  return state.get();
}
function accumulateProps(map) {
  return Object.keys(map).reduce(function (props, key) {
    var value = map[key];

    if (isRineState(value)) {
      props[key] = getValueFromState(value);
    } else {
      props[key] = value;
    }
    return props;
  }, {});
}

function connect(Component, map) {
  var translate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (v) {
    return v;
  };

  function StateBridge(props) {
    var _useState = (0, _react.useState)(accumulateProps(map)),
        _useState2 = _slicedToArray(_useState, 2),
        aprops = _useState2[0],
        setAProps = _useState2[1];

    (0, _react.useEffect)(function () {
      var unsubscribeCallbacks = [];

      Object.keys(map).forEach(function (key) {
        var value = map[key];

        if (isRineState(value)) {
          var state = value;

          unsubscribeCallbacks.push(state.subscribe(function () {
            var newValue = getValueFromState(state);

            if (!(0, _fastDeepEqual2.default)(aprops[key], newValue)) {
              setAProps(aprops = _extends({}, aprops, _defineProperty({}, key, newValue)));
            }
          }));
        }
      });
      return function () {
        unsubscribeCallbacks.forEach(function (f) {
          return f();
        });
      };
    }, []);

    return _react2.default.createElement(Component, _extends({}, translate(aprops), props));
  }

  StateBridge.displayName = 'Connected(' + (0, _utils.getFuncName)(Component) + ')';
  return StateBridge;
};