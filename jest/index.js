import '@testing-library/react/cleanup-after-each';
import CircularJSON from 'circular-json-es6';

import SerializeError from './SerializeError';

// const { SimpleConsole } = require('./Console');

// global.console = new SimpleConsole(process.stdout, process.stderr);

function sanitize(something, showErrorInConsole = false) {
  let result;

  try {
    result = JSON.parse(
      CircularJSON.stringify(
        something,
        function(key, value) {
          if (typeof value === 'function') {
            return value.name === ''
              ? '<anonymous>'
              : `function ${value.name}()`;
          }
          if (value instanceof Error) {
            return SerializeError(value);
          }
          return value;
        },
        undefined,
        true
      )
    );
  } catch (error) {
    if (showErrorInConsole) {
      console.log(error);
    }
    result = null;
  }
  return result;
}

const special = [
  'zeroth',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
  'thirteenth',
  'fourteenth',
  'fifteenth',
  'sixteenth',
  'seventeenth',
  'eighteenth',
  'nineteenth',
];

function stringifyNumber(n) {
  if (special[n]) {
    return special[n];
  }
  return n;
}

expect.extend({
  toBeCalledWithArgs(func, ...called) {
    if (func.mock.calls.length !== called.length) {
      return {
        message: () =>
          `Wrong number of calls:\n\nExpected: ${called.length}\nActual:   ${
            func.mock.calls.length
          }\n\nCalls:\n${JSON.stringify(sanitize(func.mock.calls), null, 2)}`,
        pass: false,
      };
    }

    const doesFailed = called.reduce((result, args, index) => {
      if (result !== false) return result;
      if (!this.equals(args, func.mock.calls[index])) {
        const expectedStr = JSON.stringify(sanitize(args), null, 2);
        const actualStr = JSON.stringify(
          sanitize(func.mock.calls[index]),
          null,
          2
        );

        return {
          message: () =>
            `The ${stringifyNumber(
              index + 1
            )} call happened with different arguments:\n\nExpected:\n${expectedStr}\n\nActual:\n${actualStr}`,
          pass: false,
        };
      }
      return false;
    }, false);

    if (doesFailed) {
      return doesFailed;
    }
    return {
      message: () => 'All good',
      pass: true,
    };
  },
});
