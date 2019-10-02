import equal from 'fast-deep-equal';

import { State } from './state';
import createRiew from './riew';
import reactRiew from './react';
import grid from './grid';
import { STATE_DESTROY, EFFECT_EXPORTED, HARVESTER_PRODUCE, RIEW_UNMOUNT } from './constants';
import Event from './event';

grid.on(STATE_DESTROY, (state) => {
  state.events().forEach(e => {
    if ('__exportedAs' in e) {
      h.undefineProduct(e.__exportedAs);
    }
  });
});
grid.on(EFFECT_EXPORTED, (event, name) => {
  event.__exportedAs = name;
  h.defineProduct(name, () => event);
});
grid.on(RIEW_UNMOUNT, (riew) => {
  grid.remove(riew);
});

function Harvester() {
  const api = {};
  let products = {};

  api.defineProduct = (type, func) => {
    if (products[type]) {
      throw new Error(`A product with type "${ type }" already exists.`);
    }
    products[type] = func;
  };
  api.undefineProduct = (type) => {
    if (!products[type]) {
      throw new Error(`There is no product with type "${ type }" to be removed.`);
    }
    delete products[type];
  };
  api.produce = (type, ...args) => {
    if (!products[type]) {
      throw new Error(`There is no product with type "${ type }".`);
    }
    const product = products[type](...args);

    grid.emit(HARVESTER_PRODUCE, product);
    return product;
  };
  api.reset = () => {
    products = {};
    defineHarvesterBuiltInCapabilities(api);
  };

  return api;
};

const defineHarvesterBuiltInCapabilities = function (h) {

  // ------------------------------------------------------------------ state
  h.defineProduct(
    'state',
    (initialValue, loggable) => {
      const state = State(initialValue, loggable);
      const event = Event(state, []);

      grid.add(state);
      return event;
    }
  );

  // ------------------------------------------------------------------ mergeStates
  h.defineProduct('mergeStates', (statesMap) => {
    const fetchSourceValues = () => Object.keys(statesMap).reduce((result, key) => {
      const [ s ] = statesMap[key];

      result[key] = s();
      return result;
    }, {});
    const [ effect, , sInstance ] = h.produce('state');

    sInstance.get = fetchSourceValues;
    sInstance.set = newValue => {
      if (typeof newValue !== 'object') {
        throw new Error('Wrong merged state value. Must be key-value pairs.');
      }
      Object.keys(newValue).forEach(key => {
        if (!statesMap[key]) {
          throw new Error(`There is no state with key "${ key }".`);
        }
        const [ getChildState, setChildState ] = statesMap[key];

        if (!equal(newValue[key], getChildState())) {
          setChildState(newValue[key]);
        }
      }, {});
    };

    Object.keys(statesMap).forEach(key => {
      statesMap[key].pipe(sInstance.triggerListeners).subscribe();
    });

    return effect;
  });

  // ------------------------------------------------------------------ riew
  h.defineProduct('riew', (viewFunc, ...controllers) => {
    const riew = createRiew(emit, viewFunc, ...controllers);

    grid.add(riew);
    return riew;
  });

  // ------------------------------------------------------------------ reactRiew
  h.defineProduct('reactRiew', (viewFunc, ...controllers) => {
    return reactRiew(viewFunc, ...controllers);
  });
};

const h = Harvester();

defineHarvesterBuiltInCapabilities(h);

export default h;
