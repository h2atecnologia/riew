/* eslint-disable quotes, max-len */
import riew from '../riew';
import { delay } from '../__helpers__';
import { createState as state } from '../state';

describe('Given the `riew` function', () => {
  describe('when we create a riew', () => {
    it(`should
      * set the instance to active
      * run the controller function
      * pass render function to the controller function
      * pass util methods to the controller function (isActive)
      * call the view function at least once and on every "render" call`, () => {
      const controllerSpy = jest.fn().mockImplementation(({ render, isActive }) => {
        expect(isActive()).toBe(true);
        render({ foo: 'bar' });
      });
      const viewSpy = jest.fn();
      const instance = riew(viewSpy, controllerSpy);

      instance.in({ not: 'used at all' });

      expect(instance.isActive()).toBe(true);
      expect(viewSpy).toBeCalledTimes(1);
      expect(viewSpy.mock.calls[0]).toStrictEqual([{ foo: 'bar' }, expect.any(Function)]);
    });
    it('should allow us to wait till the render is done', (done) => {
      const controller = async ({ render }) => {
        await render({});
        done();
      };
      const c = riew((props, done) => done(), controller);

      c.in({});
    });
    describe('and when we use non object as initial props or for render method', () => {
      it('should throw an error', () => {
        expect(() => riew(() => {}).in('foo')).toThrowError(
          `The riew's "in" method must be called with a key-value object. Instead "foo" passed`
        );
        expect(() => riew(() => {}, ({ render }) => { render('foo'); }, () => {}).in()).toThrowError(
          `The riew's "render" method must be called with a key-value object. Instead "foo" passed`
        );
        expect(() => riew(() => {}, ({ render }) => { render('foo'); }, () => {}).in()).toThrowError(
          `The riew's "render" method must be called with a key-value object. Instead "foo" passed`
        );
      });
    });
    describe('and when we call the out method', () => {
      it('should mark the instance as not active', () => {
        const c = riew(() => {});

        c.in({});
        expect(c.isActive()).toBe(true);
        c.out();
        expect(c.isActive()).toBe(false);
      });
    });
    it('should update view props if we return something from the controller', () => {
      const controller = () => ({ foo: 'bar' });
      const view = jest.fn();
      const r = riew(view, controller);

      r.in({});
      expect(view).toBeCalledTimes(1);
      expect(view.mock.calls[0]).toStrictEqual([ { foo: 'bar' }, expect.any(Function) ]);
    });
  });
  describe('when we use props', () => {
    it('should allow us to react on props changes', () => {
      const propsSpy = jest.fn();
      const viewSpy = jest.fn();
      const c = riew(viewSpy, ({ props }) => {
        expect(props.get()).toStrictEqual({ a: 'b' });
        props.stream.pipe(propsSpy);
      });

      c.in({ a: 'b' });
      c.update({ c: 'd' });

      expect(propsSpy).toBeCalledTimes(2);
      expect(propsSpy.mock.calls[0]).toStrictEqual([{ a: 'b' }]);
      expect(propsSpy.mock.calls[1]).toStrictEqual([{ a: 'b', 'c': 'd' }]);
      expect(viewSpy).toBeCalledTimes(1);
      expect(viewSpy.mock.calls[0]).toStrictEqual([{}, expect.any(Function)]);
    });
    describe('and we subscribe for updates and call the render', () => {
      it('should not end up in a endless loop', () => {
        const spy = jest.fn();
        const propsSpy = jest.fn();
        const r = riew(
          spy,
          ({ props, render }) => {
            props.stream.pipe(({ value }) => {
              propsSpy(value);
              render({ foo: value });
            });
          }
        );

        r.in({ value: 'bar' });
        r.update({ value: 'moo' });

        expect(spy).toBeCalledTimes(2);
        expect(spy.mock.calls[0]).toStrictEqual([ { foo: 'bar' }, expect.any(Function) ]);
        expect(spy.mock.calls[1]).toStrictEqual([ { foo: 'moo' }, expect.any(Function) ]);
        expect(propsSpy).toBeCalledTimes(2);
        expect(propsSpy.mock.calls[0]).toStrictEqual([ 'bar' ]);
        expect(propsSpy.mock.calls[1]).toStrictEqual([ 'moo' ]);
      });
    });
  });
  describe('when we use `with` method', () => {
    it(`should
      * create a states from the given object if the keys start with $
      * render with the created states as props
      * re-render if we update the states
      * teardown the created states when we call "out" method`, () => {
      const spy = jest.fn();
      const controller = jest.fn().mockImplementation(({ s1, s2 }) => {
        s1.set('bar');
        s2.set('noo');
      });
      const r = riew(spy, controller).with({ $s1: 'foo', $s2: 'moo' });

      r.in({});

      let s1 = controller.mock.calls[0][0].s1;
      let s2 = controller.mock.calls[0][0].s2;

      expect(spy).toBeCalledTimes(1);
      expect(spy.mock.calls[0]).toStrictEqual([ { s1: 'bar', s2: 'noo' }, expect.any(Function) ]);
      expect(s1.active()).toBe(true);
      expect(s2.active()).toBe(true);
      r.out();
      expect(s1.active()).toBe(false);
      expect(s2.active()).toBe(false);
    });
    describe('and when we pass primitive values', () => {
      it('should just proxy them to the controller and view', () => {
        const spy = jest.fn();
        const r = riew(
          ({ foo, bar }) => foo(bar + 10),
          ({ foo, bar }) => foo(bar),
        ).with({ foo: spy, bar: 10 });

        r.in({});

        expect(spy).toBeCalledTimes(2);
        expect(spy.mock.calls[0]).toStrictEqual([ 10 ]);
        expect(spy.mock.calls[1]).toStrictEqual([ 20 ]);
      });
    });
    describe('and when we use same instance with different externals', () => {
      it('should keep the externals and instances different', () => {
        const spy = jest.fn();
        const r = riew(spy);
        const ra = r.with({ foo: 'bar' });
        const rb = r.with({ moo: 'noo' });

        ra.in({});
        rb.in({});

        expect(spy).toBeCalledTimes(2);
        expect(spy.mock.calls[0]).toStrictEqual([ { foo: 'bar' }, expect.any(Function) ]);
        expect(spy.mock.calls[1]).toStrictEqual([ { moo: 'noo' }, expect.any(Function) ]);
      });
    });
    describe('and when we update the created states async', () => {
      it('should trigger re-render', async () => {
        const spy = jest.fn();

        riew(
          spy,
          async ({ s1, s2 }) => {
            await delay(5);
            s1.set('bar');
            s2.set('noo');
          }
        ).with({ $s1: 'foo', $s2: 'moo' }).in();

        await delay(7);

        expect(spy).toBeCalledTimes(3);
        expect(spy.mock.calls[0]).toStrictEqual([ { s1: 'foo', s2: 'moo' }, expect.any(Function) ]);
        expect(spy.mock.calls[1]).toStrictEqual([ { s1: 'bar', s2: 'moo' }, expect.any(Function) ]);
        expect(spy.mock.calls[2]).toStrictEqual([ { s1: 'bar', s2: 'noo' }, expect.any(Function) ]);
      });
    });
    describe('and when we pass an already created state', () => {
      it(`should 
        * use the already created one
        * should NOT teardown the already created one`, async () => {
        const spy = jest.fn();
        const controller = jest.fn().mockImplementation(async ({ s }) => {
          await delay(5);
          s.set('bar');
        });
        const alreadyCreated = state('foo');
        const r = riew(spy, controller).with({ s: alreadyCreated }).in();

        expect(controller.mock.calls[0][0].s).toBe(alreadyCreated);

        await delay(7);
        r.out();

        expect(spy).toBeCalledTimes(2);
        expect(spy.mock.calls[0]).toStrictEqual([ { s: 'foo' }, expect.any(Function) ]);
        expect(spy.mock.calls[1]).toStrictEqual([ { s: 'bar' }, expect.any(Function) ]);
        expect(alreadyCreated.active()).toBe(true);
      });
    });
    describe('and when we pass a trigger', () => {
      it(`should
          * run the trigger and pass down the value to the view
          * subscribe to the state and trigger the view on update`, () => {
        const s = state({ firstName: 'John', lastName: 'Doe' });
        const getFirstName = s.map(({ firstName }) => firstName);
        const spy = jest.fn();
        const r = riew(
          spy,
          ({ firstName }) => {
            expect(firstName).toBeDefined();
          }
        ).with({ firstName: getFirstName });

        r.in({});
        s.set({ firstName: 'Steve', lastName: 'Martin' });

        expect(spy).toBeCalledTimes(2);
        expect(spy.mock.calls[0]).toStrictEqual([ { firstName: 'John' }, expect.any(Function) ]);
        expect(spy.mock.calls[1]).toStrictEqual([ { firstName: 'Steve' }, expect.any(Function) ]);
      });
      it('should not call the view if the riew is not active', () => {
        const s = state({ firstName: 'John', lastName: 'Doe' });
        const getFirstName = s.map(({ firstName }) => firstName);
        const spy = jest.fn();
        const r = riew(spy).with({ getFirstName });

        r.in({});
        r.out();
        s.set({ firstName: 'Steve', lastName: 'Martin' });

        expect(spy).toBeCalledTimes(1);
        expect(spy.mock.calls[0]).toStrictEqual([ { getFirstName: 'John' }, expect.any(Function) ]);
      });
      it('should not subscribe for state changes if we pass a trigger that mutates the state', () => {
        const view = jest.fn();
        const s = state({ firstName: 'John', lastName: 'Doe' });
        const changeFirstName = s.mutate((name, newName) => ({ firstName: newName, lastName: name.lastName }));
        const r = riew(view).with({ changeFirstName });
        const warn = jest.spyOn(global.console, 'warn').mockImplementation(() => {});

        r.in();
        s.set({ firstName: 'Steve', lastName: 'Martin' });

        expect(view).toBeCalledTimes(1);
        expect(view.mock.calls[0]).toStrictEqual([ {}, expect.any(Function) ]);
        expect(warn).toBeCalledTimes(1);
        expect(warn).toBeCalledWith(expect.any(String));
        warn.mockRestore();
      });
    });
  });
  describe('when we use `withState` method', () => {
    it('should proxy to `with` method and create the states', () => {
      const spy = jest.fn();
      const controller = jest.fn().mockImplementation(({ s1, s2 }) => {
        s1.set('bar');
        s2.set('noo');
      });
      const r = riew(spy, controller).withState({ s1: 'foo', s2: 'moo' });

      r.in({});

      expect(spy).toBeCalledTimes(1);
      expect(spy.mock.calls[0]).toStrictEqual([ { s1: 'bar', s2: 'noo' }, expect.any(Function) ]);
    });
  });
  describe('when we call the riew with just one argument', () => {
    it('should assume that this argument is the view function', () => {
      const spy = jest.fn();
      const r = riew(spy).with({ $foo: 'bar' });

      r.in({});

      expect(spy).toBeCalledTimes(1);
      expect(spy.mock.calls[0]).toStrictEqual([ { foo: 'bar' }, expect.any(Function) ]);
    });
  });
  describe('when we want to test the riew', () => {
    it('should allow us to pass custom one-shot statesMap and keep the old riew working', () => {
      const s = state('foo');
      const spy = jest.fn();
      const controller = jest.fn().mockImplementation(({ s }) => spy(s.get()));
      const view = jest.fn();
      const r = riew(view, controller).with({ s });
      const rTest = r.test({ s: state('bar') });

      r.in({});
      rTest.in({});

      expect(controller).toBeCalledTimes(2);
      expect(controller.mock.calls[0]).toStrictEqual([
        expect.objectContaining({ s: expect.objectContaining({ __riew: true }) })
      ]);
      expect(controller.mock.calls[1]).toStrictEqual([
        expect.objectContaining({ s: expect.objectContaining({ __riew: true }) })
      ]);
      expect(spy).toBeCalledTimes(2);
      expect(spy.mock.calls[0]).toStrictEqual([ 'foo' ]);
      expect(spy.mock.calls[1]).toStrictEqual([ 'bar' ]);
      expect(view).toBeCalledTimes(2);
      expect(view.mock.calls[0]).toStrictEqual([ { s: 'foo' }, expect.any(Function) ]);
      expect(view.mock.calls[1]).toStrictEqual([ { s: 'bar' }, expect.any(Function) ]);
    });
  });
  describe('when we want to use an exported into the registry state', () => {
    it('should give us access to the state + subscribe to it', () => {
      const s = state('world').export('hello');
      const view = jest.fn();
      const r = riew(view).withState({ foo: 'bar' }, 'hello');

      r.in();
      s.set('ZZZ');
      expect(view).toBeCalledTimes(2);
      expect(view.mock.calls[0]).toStrictEqual([
        { foo: 'bar', hello: 'world' },
        expect.any(Function)
      ]);
      expect(view.mock.calls[1]).toStrictEqual([
        { foo: 'bar', hello: 'ZZZ' },
        expect.any(Function)
      ]);
    });
  });
});