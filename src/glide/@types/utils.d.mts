/**
 * Turns a mapping of `[message name]: MessageData` into a discriminated union of
 * `{ name: 'message name'; data: MessageData }`, useful for typing the `receiveMessage()`
 * actor method.
 */
type ActorReceiveMessage<
  Messages extends Record<string, any>,
  Queries extends { [K in keyof Queries]: GlideActorQuery },
> = {
  [K in keyof Messages | keyof Queries]: {
    name: K;
    data: K extends keyof Messages ? Messages[K]
    : K extends keyof Queries ? Queries[K]["props"]
    : never;
  };
}[keyof Messages | keyof Queries];

type Equals<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true
  : false;

type Assert<T extends U, U> = T;

/**
 * Remove `readonly` from all keys in the given object type.
 */
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Filter out `readonly` properties from the given object type.
 */
type NonReadonly<T> = Pick<
  T,
  {
    [K in keyof T]: T[K] extends Readonly<any> ? never : K;
  }[keyof T]
>;
