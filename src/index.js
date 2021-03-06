import R from './registry';
import Grid from './grid';
import Logger from './logger';
import { resetIds } from './utils';
import reactRiew from './react';
import b from './csp/buf';
import c from './csp/channel';
import ops from './csp/ops';
import s from './csp/state';
import insp from './inspector';

export const OPEN = Symbol('OPEN');
export const CLOSED = Symbol('CLOSED');
export const ENDED = Symbol('ENDED');
export const PUT = 'PUT';
export const TAKE = 'TAKE';
export const NOOP = 'NOOP';
export const SLEEP = 'SLEEP';
export const STOP = 'STOP';
export const READ = 'READ';
export const CALL_ROUTINE = 'CALL_ROUTINE';
export const FORK_ROUTINE = 'FORK_ROUTINE';
export const NOTHING = Symbol('NOTHING');
export const ALL_REQUIRED = Symbol('ALL_REQUIRED');
export const ONE_OF = Symbol('ONE_OF');

export const CHANNELS = {
  channels: {},
  getAll() {
    return this.channels;
  },
  get(id) {
    return this.channels[id];
  },
  set(id, ch) {
    this.channels[id] = ch;
    return ch;
  },
  del(id) {
    delete this.channels[id];
  },
  exists(id) {
    return !!this.channels[id];
  },
  reset() {
    this.channels = {};
  },
};

export const buffer = b;
export const chan = c;
export const fixed = (size = 0, id = null, parent = null) =>
  chan(id || 'fixed', buffer.fixed(size), parent);
export const sliding = (size = 1, id = null, parent = null) =>
  chan(id || 'sliding', buffer.sliding(size), parent);
export const dropping = (size = 1, id = null, parent = null) =>
  chan(id || 'dropping', buffer.dropping(size), parent);
export const state = s;

export * from './riew';

export const react = {
  riew: (...args) => reactRiew(...args),
};
export const use = (name, ...args) => R.produce(name, ...args);
export const register = (name, whatever) => {
  R.defineProduct(name, () => whatever);
  return whatever;
};
export const logger = new Logger();
export const grid = new Grid();
export const reset = () => (
  resetIds(), grid.reset(), R.reset(), CHANNELS.reset(), logger.reset()
);
export const registry = R;
export const sput = ops.sput;
export const put = ops.put;
export const stake = ops.stake;
export const take = ops.take;
export const read = ops.read;
export const sread = ops.sread;
export const listen = ops.listen;
export const unsubAll = ops.unsubAll;
export const close = ops.close;
export const sclose = ops.sclose;
export const channelReset = ops.channelReset;
export const schannelReset = ops.schannelReset;
export const call = ops.call;
export const fork = ops.fork;
export const merge = ops.merge;
export const timeout = ops.timeout;
export const verifyChannel = ops.verifyChannel;
export const isChannel = ops.isChannel;
export const getChannel = ops.getChannel;
export const isRiew = ops.isRiew;
export const isState = ops.isState;
export const isRoutine = ops.isRoutine;
export const go = ops.go;
export const sleep = ops.sleep;
export const stop = ops.stop;
export const inspector = insp(logger);
