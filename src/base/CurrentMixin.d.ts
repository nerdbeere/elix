// Elix is a JavaScript project, but we define TypeScript declarations so we can
// confirm our code is type safe, and to support TypeScript users.

/// <reference path="../core/shared.d.ts"/>

declare const CurrentMixin: StateMixin<
  {},
  {},
  {
    selected: boolean;
  },
  {
    selected: boolean;
  }
>;

export default CurrentMixin;
