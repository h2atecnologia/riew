import BufferInterface from './Interface';

export default function FixedBuffer(size = 0) {
  const api = BufferInterface();
  const { value, takes, puts } = api;

  api.put = item => {
    if (takes.length === 0) {
      if (value.length < size) {
        value.push(item);
        return Promise.resolve(true);
      }
      return new Promise(resolve => {
        puts.push(v => {
          value.push(item);
          resolve(v || true);
        });
      });
    }
    value.push(item);
    return new Promise(resolve => {
      resolve(true);
      takes.shift()(value.shift());
    });
  };
  api.take = () => {
    if (value.length === 0) {
      if (puts.length === 0) {
        return new Promise(resolve => takes.push(resolve));
      }
      puts.shift()();
      return api.take();
    }
    const v = value.shift();
    if (value.length < size && puts.length > 0) {
      puts.shift()();
    }
    return Promise.resolve(v);
  };

  return api;
}
