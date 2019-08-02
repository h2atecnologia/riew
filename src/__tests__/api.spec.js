/* eslint-disable react/prop-types, camelcase */
import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { delay, exerciseHTML } from '../__helpers__';

import { routine, System, partial, store, connect } from '../index';

describe('Given the Rine library', () => {
  describe('when using `take` and `put`', () => {
    it(`should
      - pause the routine till the event is fired
      - allow for only one put`, async () => {
      const A = routine(async ({ render, take, put }) => {
        act(() => render(<button onClick={ () => put('xxx', 'bar') }>click me</button>));
        const r = await take('xxx');

        expect(r).toEqual('bar');
        act(() => render(<p>Yeah</p>));
      });

      const { container, getByText } = render(<A />);

      fireEvent.click(getByText('click me'));

      await delay(1);
      exerciseHTML(container, `
        <p>Yeah</p>
      `);
      expect(System.debug().pending).toHaveLength(0);
    });
  });
  describe('when using `take` in a fork fashion', () => {
    it(`should
      - run the callback after the put call
      - allow for only one put call`, async () => {
      const A = routine(async ({ render, take, put }) => {
        act(() => render(<button onClick={ () => put('foo', 'bar') }>click me</button>));
        take('foo', async (r) => {
          expect(r).toEqual('bar');
          act(() => render(<p>Yeah</p>));
        });
      });

      const { container, getByText } = render(<A />);

      fireEvent.click(getByText('click me'));

      exerciseHTML(container, `
        <p>Yeah</p>
      `);
      expect(System.debug().pending).toHaveLength(0);
    });
  });
  describe('when using `takeEvery` and `put`', () => {
    it('should fire the callback on every `put`', async () => {
      const Counter = ({ value, onClick }) => (
        <React.Fragment>
          <p>{ value }</p>
          <button onClick={ onClick }>click me</button>)
        </React.Fragment>
      );
      const A = routine(async ({ render, takeEvery, put }) => {
        let counter = 0;
        let renderCounter = () => act(() => render(<Counter value={ counter } onClick={ () => put('foo', 2) } />));

        renderCounter();
        takeEvery('foo', (payload) => {
          counter += payload;
          renderCounter();
        });
      });

      const { container, getByText } = render(<A />);

      fireEvent.click(getByText('click me'));
      exerciseHTML(container.querySelector('p'), '2');
      fireEvent.click(getByText('click me'));
      fireEvent.click(getByText('click me'));
      fireEvent.click(getByText('click me'));
      exerciseHTML(container.querySelector('p'), '8');
    });
  });
  describe('when using `take` and `put` in different routines', () => {
    it('should allow the communication between them', async () => {
      const A = routine(async ({ take, render }) => {
        await take('foo');
        act(() => render(<p>It works</p>));
      });
      const B = routine(async ({ put }) => {
        await delay(10);
        put('foo');
      });

      const { container } = render(
        <React.Fragment>
          <A />
          <B />
        </React.Fragment>
      );

      await delay(11);
      exerciseHTML(container, `
        <p>It works</p>
      `);
    });
  });
  describe('when using a partial', () => {
    it('should re-render when the value is updated', async () => {
      const Error = partial(({ error, cls }) => {
        return error ? <div className={ cls }>{ error }</div> : <span className={ cls }>No error</span>;
      })({ error: 'Moo' });

      const A = routine(async ({ render }) => {
        expect(Error.get().error).toBe('Moo');
        Error.set({ error: 'Foo' });

        render(
          <React.Fragment>
            <Error cls='error-class'/>
            <h1>Hey</h1>
          </React.Fragment>
        );

        await delay(20);
        act(() => Error.set({ error: 'Bar' }));
        expect(Error.get().error).toEqual('Bar');
      });

      const { container } = render(<A />);

      exerciseHTML(container, `
        <div class="error-class">Foo</div>
        <h1>Hey</h1>
      `);
      await delay(30);
      exerciseHTML(container, `
        <div class="error-class">Bar</div>
        <h1>Hey</h1>
      `);
    });
    it('should keep the previous props', () => {
      const mock = jest.fn();
      const P = partial(function (props) {
        mock(props);
        return null;
      });
      const Partial = P({ foo: 1 });

      const { rerender } = render(<Partial bar={ 2 }/>);

      expect(mock).toBeCalledWith({ foo: 1, bar: 2 });
      rerender(<Partial bar={ 3 } />);
      expect(mock).toBeCalledWith({ foo: 1, bar: 3 });
      act(() => Partial.set({ foo: 2 }));
      expect(mock).toBeCalledWith({ foo: 2, bar: 3 });
      act(() => Partial.set({ zoo: 4 }));
      expect(mock).toBeCalledWith({ foo: 2, bar: 3, zoo: 4 });
    });
  });
  describe('when we use the `isMounted` method', () => {
    it('should return the value of the `mounted` flag', async () => {
      const spy = jest.fn();
      const A = routine(async ({ isMounted }) => {
        spy(isMounted());
        await delay(10);
        spy(isMounted());
      });

      const { unmount } = render(<A />);

      unmount();
      await delay(11);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy.mock.calls[0]).toStrictEqual([true]);
      expect(spy.mock.calls[1]).toStrictEqual([false]);
    });
  });
  describe('when we use the `store` and `connect` api', () => {
    it('should allow us to keep state and hook components', async () => {
      const SpyA = jest.fn().mockImplementation(() => null);
      const R = routine(async () => {
        const s1 = store({ foo: '1' });
        const s2 = store({ moo: '1' });

        const ConnectedA = connect(SpyA, s1, s2);

        render(<ConnectedA a={ 1 } />);
        await delay(10);
        act(() => s1.set({ foo: '2' }));
        act(() => s2.set({ moo: '2' }));
        act(() => s1.set({ foo: '3' }));
        await delay(10);
        render(<ConnectedA a={ 2 } />);
      });

      render(<R />);

      await delay(40);

      expect(SpyA).toBeCalledTimes(5);
      expect(SpyA.mock.calls[0]).toStrictEqual([{ a: 1, foo: '1', moo: '1' }, {}]);
      expect(SpyA.mock.calls[1]).toStrictEqual([{ a: 1, foo: '2', moo: '1' }, {}]);
      expect(SpyA.mock.calls[2]).toStrictEqual([{ a: 1, foo: '2', moo: '2' }, {}]);
      expect(SpyA.mock.calls[3]).toStrictEqual([{ a: 1, foo: '3', moo: '2' }, {}]);
      expect(SpyA.mock.calls[4]).toStrictEqual([{ a: 2, foo: '3', moo: '2' }, {}]);
    });
  });
});
