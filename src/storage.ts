type StorageValue = Record<string, any>;

/*
type StorageProps = {
  storage?: 'memory' | 'redis' | 'db',
  connection?: any,
};
*/

export type Storage = {
  set: CallableFunction,
  get: CallableFunction,
  setItem: CallableFunction,
  removeItem: CallableFunction,
};

export default function headers(value: StorageValue = {}): Storage {
  let singleton: StorageValue = value;
  return {
    set: (value: Storage): StorageValue => {
      singleton = { ...singleton, ...value };
      return singleton;
    },

    get: (key: string|boolean = false, fallbackVal: any = undefined): any => {
      if (!key) return singleton;
      return (singleton[key.toString()] || fallbackVal);
    },

    setItem: (key: string, value: any): StorageValue => {
      singleton = { ...singleton, [key]: value };
      return singleton;
    },

    removeItem: (key: string): StorageValue => {
      delete singleton[key];
      return singleton;
    },
  };
}
