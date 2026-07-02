# Implementation Backlog

This backlog follows the implementation order derived from [project.md](project.md) and [Entity Class.puml](Entity%20Class.puml).

## Guiding Order

1. Stabilize routes, auth, and dead surface area.
2. Extract service boundaries around the workflows that already exist.
3. Add event-driven side effects for notifications, audit, and email.
4. Enforce lifecycle state transitions.
5. Only then decide which diagram-only features should become product work.

## Phase 0. Stabilization

- [x] Split the duplicate `/api/auth/logout` behavior by audience.
- [x] Remove or lock down diagnostic routes before production.
- [x] Confirm whether `EnsureAdmin` is still needed or can be retired.
- [x] Remove the dead `TenantAdmin` model or replace it with a compatibility shim.
- [x] Add backend tests for tenant resolution and auth boundaries.

## Phase 1. Service Boundaries

- [x] Extract an admin facade or application service layer for tenant, billing, feature flag, and audit workflows.
- [x] Introduce a dedicated fan-service layer for blog, event, merch, and membership actions.
- [x] Normalize the tenant workspace shell naming (`tenant-panel.blade.php`, workspace labels, docs).
- [x] Centralize tenant-aware query helpers or repositories only where repetition is already a problem.
- [ ] Keep controllers thin and limit them to request/response handling.
- [x] Extract merch workflow logic out of the manage controller.
- [x] Extract blog publish/comment workflow logic out of the manage controller.

## Phase 2. Events And Observer

- [x] Add the first publish event/listener path.
- [ ] Emit domain events for merch updates, event creation, subscription changes, and order status changes.
- [ ] Hook notifications, audit logs, and outbound email to those events.
- [ ] Add queue-backed jobs when a side effect does not need to block the request.
- [ ] Use the event layer to eliminate duplicated side-effect code in controllers.

## Phase 3. Lifecycle Control

- [ ] Enforce order status transitions.
- [ ] Enforce subscription state transitions.
- [ ] Define valid payment provider state changes.
- [ ] Add tests for invalid transitions and rejected state jumps.

## Phase 4. Diagram-Only Domains

- [ ] Decide whether media gallery and discography should ship.
- [ ] Decide whether external sites with click tracking should replace or extend `SocialLink`.
- [ ] Decide whether granular tenant RBAC should replace the boolean tenant-admin flag.
- [ ] Decide whether impersonation should be persisted as a first-class record.
- [ ] Decide whether plan-feature linkage should replace the current disconnected feature-flag flow.

## Recommended Next Commit

1. Add the first event-driven side effect path for a publish or merch workflow.
2. Hook audit or notification handling into that event.
3. Add a focused test for the new event-driven path.

## Notes

- The UML file looks like a target-state design, not a literal implementation checklist.
- The current codebase already covers the core fan, merch, events, membership, and blog flows, so the refactor should protect that working surface first.
- New architecture should be introduced only where it reduces duplicated logic or unlocks a missing behavior.
- The test scaffold is checked in, but the repo still needs its dev test dependencies installed before those tests can be executed locally.
