/* eslint-disable react/prop-types, camelcase, no-shadow */
import React, { useState } from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { delay, exerciseHTML } from '../__helpers__';
import {
  sliding,
  reset,
  sread,
  react,
  state,
  sleep,
  sput,
  listen,
} from '../index';

const { riew } = react;
const DummyComponent = ({ text }) => <p>{text}</p>;

describe('Given the Riew library', () => {
  beforeEach(() => {
    reset();
  });
  describe('when we use an async effect', () => {
    it('should allow us to render multiple times', () =>
      act(async () => {
        const A = riew(DummyComponent, function*({ render }) {
          render({ text: 'Hello' });
          yield sleep(20);
          render({ text: 'world' });
        });

        const { queryByText, getByText } = render(<A />);

        await delay(3);
        expect(getByText('Hello')).toBeDefined();
        await delay(21);
        expect(queryByText('Hello')).toBe(null);
        expect(getByText('world')).toBeDefined();
      }));
    it('should not try to re-render if the bridge is unmounted', () =>
      act(async () => {
        const spy = jest.spyOn(console, 'error');
        const A = riew(DummyComponent, function*({ render }) {
          yield sleep(10);
          render({ text: 'world' });
        });

        const { unmount } = render(<A />);
        await delay(3);
        unmount();
        await delay(21);
        expect(spy).not.toBeCalled();
        spy.mockRestore();
      }));
  });
  describe('when reusing the same riew', () => {
    it('should create a separate instance', () =>
      act(async () => {
        const R = riew(props => <p>{props.answer}</p>);

        const { container } = render(<R answer="foo" />);
        const { container: container2, rerender: rerender2 } = render(
          <R answer="bar" />
        );

        await delay(3);

        exerciseHTML(container, `<p>foo</p>`);
        exerciseHTML(container2, `<p>bar</p>`);
        rerender2(<R answer="zoo" />);
        await delay(3);
        exerciseHTML(container, `<p>foo</p>`);
        exerciseHTML(container2, `<p>zoo</p>`);
      }));
  });
  describe('when using riew with a hook', () => {
    it('should keep the hook working', () =>
      act(async () => {
        const Input = function() {
          const [text, setText] = useState('');

          return (
            <React.Fragment>
              <p>{text}</p>
              <input
                onChange={e => setText(e.target.value)}
                data-testid="input"
              />
            </React.Fragment>
          );
        };
        const Form = riew(() => (
          <form>
            <Input />
          </form>
        ));

        const { getByTestId, getByText } = render(<Form />);
        await delay(2);
        fireEvent.change(getByTestId('input'), { target: { value: 'foobar' } });
        await delay(2);
        expect(getByText('foobar')).toBeDefined();
      }));
  });
  describe('when we use useState hook together with props', () => {
    it('should get props callback fired every time when we update the state', () =>
      act(async () => {
        const FetchTime = riew(
          function({ location }) {
            return location ? <p>{location}</p> : null;
          },
          function*({ render, props }) {
            sread(props, ({ city }) => render({ location: city }), {
              listen: true,
            });
          }
        );
        const App = function() {
          const [city, setCity] = useState('');

          return (
            <React.Fragment>
              <select
                onChange={e => setCity(e.target.value)}
                data-testid="select"
              >
                <option value="">pick a city</option>
                <option value="London">London</option>
                <option value="Paris">Paris</option>
                <option value="Barcelona">Barcelona</option>
                <option value="Sofia">Sofia</option>
              </select>
              <div data-testid="text">
                <FetchTime city={city} />
              </div>
            </React.Fragment>
          );
        };

        const { getByTestId } = render(<App />);

        await delay(2);
        exerciseHTML(getByTestId('text'), '');
        fireEvent.change(getByTestId('select'), { target: { value: 'Paris' } });
        await delay(2);
        exerciseHTML(getByTestId('text'), '<p>Paris</p>');
        fireEvent.change(getByTestId('select'), { target: { value: 'Sofia' } });
        await delay(2);
        exerciseHTML(getByTestId('text'), '<p>Sofia</p>');
      }));
  });
  describe('when we mutate the state and have a selector subscribed to it', () => {
    it('should re-render the view with the new data', () =>
      act(async () => {
        const repos = state([
          { id: 'a', selected: false },
          { id: 'b', selected: true },
        ]);
        const update = repos.mutate((list, id) =>
          list.map(repo => {
            if (repo.id === id) {
              return {
                ...repo,
                prs: ['foo', 'bar'],
              };
            }
            return repo;
          })
        );
        const selector = repos.select(list =>
          list.filter(({ selected }) => selected)
        );

        const change = id => sput(update, id);
        const View = ({ selector }) => (
          <div>
            {selector.map(({ id, prs }) => (
              <p key={id}>
                {id}: {prs ? prs.join(',') : 'nope'}
              </p>
            ))}
          </div>
        );
        const routine = function*({ change }) {
          yield sleep(2);
          change('b');
        };
        const R = riew(View, routine).with({ selector, change });
        const { container } = render(<R />);

        await delay();
        exerciseHTML(
          container,
          `
        <div>
          <p>b: nope</p>
        </div>
      `
        );
        await delay(10);
        exerciseHTML(
          container,
          `
        <div>
          <p>b: foo,bar</p>
        </div>
      `
        );
      }));
  });
  describe('when we have a channel passed to a React component', () => {
    describe('and we update the state', () => {
      it('should re-render the react component with the correct data', () =>
        act(async () => {
          const s = state([15, 4, 12]);
          const moreThen10 = s.select(nums => nums.filter(n => n > 10));
          const Component = jest.fn().mockImplementation(() => null);
          const R = riew(Component).with({ data: moreThen10 });

          render(<R />);
          await delay(3);
          sput(s, [5, 6, 7, 120]);
          await delay(3);
          expect(Component).toBeCalledWithArgs(
            [{ data: [15, 12] }, {}],
            [{ data: [120] }, {}]
          );
        }));
    });
  });
  describe('when we define a mutation', () => {
    it('should be possible to react on the mutation', () => {
      const current = state('xxx');
      const spy = jest.fn();
      const reset = sliding();

      current.mutate(reset, () => 'foobar');
      listen(reset, spy);

      sput(reset, 12);
      sput(reset, 22);

      expect(spy).toBeCalledWithArgs([12], [22]);
    });
  });
});
