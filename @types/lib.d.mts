interface SymbolConstructor {
  /**
   * A method that is used to release resources held by an object. Called by the semantics of the `using` statement.
   */
  readonly dispose: unique symbol;

  /**
   * A method that is used to asynchronously release resources held by an object. Called by the semantics of the `await using` statement.
   */
  readonly asyncDispose: unique symbol;
}

interface Disposable {
  [Symbol.dispose](): void;
}

interface AsyncDisposable {
  [Symbol.asyncDispose](): PromiseLike<void>;
}

interface ArrayConstructor {
  /**
   * Creates an array from an async iterator or iterable object.
   * @param iterableOrArrayLike An async iterator or array-like object to convert to an array.
   */
  fromAsync<T>(
    iterableOrArrayLike: AsyncIterable<T> | Iterable<T | PromiseLike<T>> | ArrayLike<T | PromiseLike<T>>,
  ): Promise<T[]>;

  /**
   * Creates an array from an async iterator or iterable object.
   *
   * @param iterableOrArrayLike An async iterator or array-like object to convert to an array.
   * @param mapfn A mapping function to call on every element of itarableOrArrayLike.
   *      Each return value is awaited before being added to result array.
   * @param thisArg Value of 'this' used when executing mapfn.
   */
  fromAsync<T, U>(
    iterableOrArrayLike: AsyncIterable<T> | Iterable<T> | ArrayLike<T>,
    mapFn: (value: Awaited<T>, index: number) => U,
    thisArg?: any,
  ): Promise<Awaited<U>[]>;
}

interface Map<K, V> {
  /**
   * The getOrInsert() method of Map instances returns the value corresponding to the specified key in this Map.
   *
   * If the key is not present, it inserts a new entry with the key and a given default value, and returns the inserted value.
   *
   * If the computation of the default value is expensive, consider using Map.prototype.getOrInsertComputed() instead, which takes a callback to compute the default value only if it's actually needed.
   *
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/getOrInsert
   */
  getOrInsert(key: K, defaultValue: V): V;

  /**
   * The getOrInsertComputed() method of Map instances returns the value corresponding to the specified key in this Map.
   *
   * If the key is not present, it inserts a new entry with the key and a default value computed from a given callback, and returns the inserted value.
   *
   * Use this method instead of Map.prototype.getOrInsert() when the default value is expensive to compute, and you want to avoid computing it unless it's actually needed.
   *
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/getOrInsertComputed
   */
  getOrInsertComputed(key: K, callback: (key: K) => V): V;
}

interface WeakMap<K, V> {
  /**
   * The getOrInsert() method of Map instances returns the value corresponding to the specified key in this Map.
   *
   * If the key is not present, it inserts a new entry with the key and a given default value, and returns the inserted value.
   *
   * If the computation of the default value is expensive, consider using Map.prototype.getOrInsertComputed() instead, which takes a callback to compute the default value only if it's actually needed.
   *
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/getOrInsert
   */
  getOrInsert(key: K, defaultValue: V): V;

  /**
   * The getOrInsertComputed() method of Map instances returns the value corresponding to the specified key in this Map.
   *
   * If the key is not present, it inserts a new entry with the key and a default value computed from a given callback, and returns the inserted value.
   *
   * Use this method instead of Map.prototype.getOrInsert() when the default value is expensive to compute, and you want to avoid computing it unless it's actually needed.
   *
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/getOrInsertComputed
   */
  getOrInsertComputed(key: K, callback: (key: K) => V): V;
}
