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
