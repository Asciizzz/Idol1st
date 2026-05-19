# VirtualSite Workspace Contract

This folder follows `resources/AIsign.md` as baseline writing/style guidance.

## Mandatory Rules

1. Every method/function in `resources/virtualsite/*` must include JSDoc:

```js
/**
 * Purpose.
 * @param {Type} name - Description.
 * @returns {Type} Description.
 */
```

2. New modules must keep clear single responsibility.
3. Shared logic must live in reusable services, not view components.
4. Runtime and editor concerns must stay separated by module boundary.
5. No dependency on `resources/editor/*` or `resources/js/global/*`.

