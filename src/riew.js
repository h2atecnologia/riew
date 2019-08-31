import { createState as state, isRiewState, isRiewQueueTrigger, IMMUTABLE } from './state';
import registry from './registry';

function noop() {};
function objectRequired(value, method) {
  if (value === null || (typeof value !== 'undefined' && typeof value !== 'object')) {
    throw new Error(`The riew's "${ method }" method must be called with a key-value object. Instead "${ value }" passed.`);
  }
}
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

export default function createRiew(viewFunc, controllerFunc = noop, externals = {}) {
  const instance = {};
  let active = false;
  let onOutCallbacks = [];
  let onRender = noop;
  const isActive = () => active;
  const riewProps = state({});
  const updateRiewProps = riewProps.mutate((current, newProps) => ({ ...current, ...newProps }));
  const viewProps = state({});
  const updateViewProps = viewProps.mutate((current, newProps) => ({ ...current, ...newProps }));
  const controllerProps = state({
    render(props) {
      objectRequired(props, 'render');
      if (!active) return Promise.resolve();
      return new Promise(done => {
        onRender = done;
        updateViewProps(props);
      });
    },
    props: riewProps,
    isActive
  });
  const updateControllerProps = controllerProps.mutate((current, newProps) => ({ ...current, ...newProps }));

  function callView() {
    viewFunc(viewProps.get(), onRender);
    onRender = noop;
  }
  function processExternals() {
    Object.keys(externals).forEach(key => {
      let isState = isRiewState(externals[key]);
      let isTrigger = isRiewQueueTrigger(externals[key]);
      let s;

      // passing a state
      if (isState) {
        s = externals[key];
        updateControllerProps({ [key]: s });
        updateViewProps({ [key]: s.get() });
        s.stream.pipe(value => updateViewProps({ [key]: value }));

      // passing a trigger
      } else if (isTrigger) {
        let trigger = externals[key];

        updateControllerProps({ [key]: trigger });
        // subscribe only if the trigger is not mutating the state
        if (trigger.__activity() === IMMUTABLE) {
          trigger.__state.stream.filter(isActive).pipe(() => updateViewProps({ [key]: trigger() }))();
        } else {
          console.warn('In the view you are not allowed to use directly a trigger that mutates the state. If you need that pass a prop from the controller to the view.');
        }

      // state in the registry
      } else if (key.charAt(0) === '$' && key.charAt(1) === '@') {
        const k = key.substr(2, key.length);

        s = registry.get(k);
        updateControllerProps({ [k]: s });
        updateViewProps({ [k]: s.get() });
        s.stream.filter(isActive).pipe(value => updateViewProps({ [k]: value }));

      // raw data that is converted to a state
      } else if (key.charAt(0) === '$') {
        const k = key.substr(1, key.length);

        s = state(externals[key]);
        onOutCallbacks.push(s.teardown);
        updateControllerProps({ [k]: s });
        updateViewProps({ [k]: s.get() });
        s.stream.filter(isActive).pipe(value => updateViewProps({ [k]: value }));

      // proxy the rest
      } else {
        updateControllerProps({ [key]: externals[key] });
        updateViewProps({ [key]: externals[key] });
      }
    });
  }

  instance.isActive = isActive;
  instance.in = (initialProps = {}) => {
    active = true;
    objectRequired(initialProps, 'in');
    updateRiewProps(initialProps);
    processExternals();

    let controllerResult = controllerFunc(controllerProps.get());

    if (controllerResult) {
      if (typeof controllerResult !== 'object') {
        throw new Error('You must return a key-value object from your controller.');
      }
      updateViewProps(controllerResult);
    }
    riewProps.stream();
    viewProps.stream.pipe(callView)();
    return instance;
  };
  instance.update = updateRiewProps;
  instance.out = () => {
    onOutCallbacks.forEach(f => f());
    onOutCallbacks = [];
    riewProps.teardown();
    viewProps.teardown();
    controllerProps.teardown();
    active = false;
    return instance;
  };
  instance.with = (...maps) => createRiew(viewFunc, controllerFunc, { ...externals, ...normalizeExternalsMap(maps) });
  instance.withState = (...maps) => {
    const nmaps = normalizeExternalsMap(maps);

    return createRiew(
      viewFunc,
      controllerFunc,
      Object.keys(nmaps).reduce((obj, key) => (obj['$' + key] = nmaps[key], obj), externals)
    );
  };
  instance.test = (map) => createRiew(viewFunc, controllerFunc, { ...externals, ...map });

  return instance;
}
