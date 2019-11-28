import BufferInterface from './Interface';

export default function FixedBuffer(size = 0) {
  const api = BufferInterface();

  api.setValue = v => (api.value = v);
  api.put = (item, callback) => {
    if (api.takes.length === 0) {
      if (api.value.length < size) {
        api.value.push(item);
        callback(true);
      } else {
        api.puts.push(v => {
          api.value.push(item);
          if (api.takes.length > 0) {
            api.takes.shift()(api.value.shift());
          }
          callback(v || true);
        });
      }
    } else {
      api.value.push(item);
      api.takes.shift()(api.value.shift());
      callback(true);
    }
  };
  api.take = callback => {
    if (api.value.length === 0) {
      api.takes.push(callback);
      if (api.puts.length > 0) {
        api.puts.shift()();
        api.take(callback);
      }
    } else {
      const v = api.value.shift();
      if (api.value.length < size && api.puts.length > 0) {
        api.puts.shift()();
      }
      callback(v);
    }
  };

  return api;
}
