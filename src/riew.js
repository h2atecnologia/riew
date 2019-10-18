import { state, use, subscribe, unsubscribe, destroy, grid } from './index';
import { isEffect } from './state';
import { isPromise, parallel, getFuncName, getId } from './utils';
import { STATE_VALUE_CHANGE } from './constants';

function normalizeExternalsMap(arr) {
  return arr.reduce((map, item) => {
    if (typeof item === 'string') {
      map = { ...map, ['@' + item]: true };
    } else {
      map = { ...map, ...item };
    }
    return map;
  }, {});
}

export default function createRiew(viewFunc, ...controllers) {
  const instance = {
    id: getId('r'),
    name: getFuncName(viewFunc)
  };
  let active = false;
  let internalStates = [];
  let onUnmountCallbacks = [];
  let subscriptions = {};
  let externals = {};
  let data = state({});

  const updateData = data.mutate((current, newStuff) => {
    if (newStuff === null || (typeof newStuff !== 'undefined' && typeof newStuff !== 'object')) {
      throw new Error(`A key-value object expected. Instead "${ newStuff }" passed.`);
    }
    // console.log('updateData', newStuff);
    return { ...current, ...newStuff };
  });
  const render = data.map(newStuff => {
    let result = {};

    Object.keys(newStuff).forEach(key => {
      if (isEffect(newStuff[key]) && !newStuff[key].isMutating()) {
        const effect = newStuff[key];
        const state = grid.getNodeById(effect.stateId);

        result[key] = effect();
        if (!subscriptions[effect.stateId]) subscriptions[effect.stateId] = {};
        subscriptions[effect.stateId][key] = effect;
        grid.subscribe(instance).to(state).when(
          STATE_VALUE_CHANGE,
          () => {
            updateData(Object.keys(subscriptions[effect.stateId]).reduce((effectsResult, key) => {
              effectsResult[key] = subscriptions[effect.stateId][key]();
              return effectsResult;
            }, {}));
          }
        );
      } else {
        result[key] = newStuff[key];
      }
    });
    return result;
  }).filter(() => active).pipe(viewFunc);

  function processExternals() {
    Object.keys(externals).forEach(key => {
      let external;

      if (key.charAt(0) === '@') {
        key = key.substr(1, key.length);
        external = use(key);
      } else {
        external = externals[key];
      }

      updateData({ [key]: external });
    });
  }

  instance.mount = (initialData = {}) => {
    if (active) {
      updateData(initialData);
      return instance;
    }
    updateData(initialData);
    processExternals();

    let controllersResult = parallel(...controllers)({
      ...data(),
      data: updateData,
      props: data,
      state(...args) {
        const s = state(...args);

        internalStates.push(s);
        return s;
      }
    });
    let done = (result) => (onUnmountCallbacks = result || []);

    if (isPromise(controllersResult)) {
      controllersResult.then(done);
    } else {
      done(controllersResult);
    }

    active = true;
    subscribe(render, true);
    return instance;
  };
  instance.update = (newData) => {
    updateData(newData);
  };
  instance.unmount = () => {
    active = false;
    unsubscribe(render);
    onUnmountCallbacks.filter(f => typeof f === 'function').forEach(f => f());
    onUnmountCallbacks = [];
    Object.keys(subscriptions).forEach(stateId => grid.unsubscribe(instance).from(grid.getNodeById(stateId)));
    subscriptions = {};
    data.destroy();
    internalStates.forEach(destroy);
    internalStates = [];
    return instance;
  };
  instance.with = (...maps) => {
    instance.__setExternals(maps);
    return instance;
  };
  instance.test = (map) => {
    const newInstance = createRiew(viewFunc, ...controllers);

    newInstance.__setExternals([ map ]);
    return newInstance;
  };
  instance.__setExternals = (maps) => {
    externals = { ...externals, ...normalizeExternalsMap(maps) };
  };
  instance.__data = data;

  return instance;
};
