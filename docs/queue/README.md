# Queue subsystem

This document is the developer-facing reference for the host's background-job
queue. It explains what we use, why, and how to add new queues without
re-deriving everything from scratch.

The queue is integrated into the host application at startup; nothing here
runs as an external service.

## Overview

The host wraps [`github.com/a-digi/coco-queue`](https://github.com/a-digi/coco-queue),
a SQLite-backed Go job queue with worker pools, retry, exponential backoff and
dead-lettering. We instantiate exactly **one** `Manager` per running host and
register named queues against it.

All host code interacts with our own façade in
[`src/plugins/queue/manager.go`](../../src/plugins/queue/manager.go).
Only the façade and the queue-registration file
[`src/plugins/queue/handlers.go`](../../src/plugins/queue/handlers.go)
are allowed to import `github.com/a-digi/coco-queue` directly. Everywhere
else depends on the `queue.Manager` interface.

## Why we use it

Some host operations are failure-prone and slow:

- They make outbound HTTP calls (catalog fetches, ZIP downloads).
- They write to disk in non-trivial ways (extract, validate, install).
- Transient network errors should retry automatically, not surface as
  permanent failures.
- A host crash mid-operation should not leave the user with a stuck "loading"
  spinner and no recovery path.

The queue addresses all four. The first concrete consumer is the marketplace
plugin install flow, which used to run synchronously inside the HTTP request
and would fail permanently on a flaky download.

Alternatives considered and rejected:

- **In-process goroutine pool with ad-hoc retry loops** — no persistence, so a
  crash mid-install loses the work. No restart recovery.
- **External worker process** — adds operational complexity (a second binary,
  IPC, lifecycle) for one feature. YAGNI.

## Architecture

```
HTTP handler  →  queue.Manager.Publish()  →  coco-queue worker pool  →  worker fn  →  SQLite (per-queue DB)
                                          ↑
                                          ↓ task state
                       queue.Manager.Status() ← HTTP status endpoint  ← Frontend poll
```

Per-queue SQLite databases live under `<userDataDir>/queue/`. Each queue gets
its own DB file plus a small registry DB. The DBs are durable across restarts:
on host start, `coco-queue` re-attaches workers and resumes any
`in_progress` tasks from where they left off.

## The façade

`src/plugins/queue/manager.go` exposes the only public surface that the rest
of the host should depend on:

```go
type Manager interface {
    Publish(queueName string, payload any) (taskID string, err error)
    Status(taskID string) (TaskStatus, error)
    ReadPayload(taskID string) ([]byte, error)
    Raw() *cocoqueue.DefaultManager
}

type TaskStatus struct {
    ID, QueueName, State, LastError string
    Attempts                        int
}

type StopFunc func(timeout time.Duration)

func NewManager(dbRoot string) (Manager, StopFunc, error)
```

`State` is one of:
`pending`, `in_progress`, `completed`, `failed`, `dead_lettered`.

`Raw()` is an escape hatch for the registration code in `handlers.go` (which
calls `CreateQueue` / `Register` directly on the underlying type). HTTP
handlers and other consumers must not use it.

The façade owns three implementation details that the upstream library does
not handle for us:

1. **Schema migrations.** `coco-queue` does not ship its own migration
   files. `manager.go` embeds `migrations/main/0001_init.sql` and
   `migrations/per/0001_init.sql` with `//go:embed` and materialises them to
   `<dbRoot>/.migrations/` on first start so `dbregistry.New` can read them.
2. **Logger bridge.** `coco-queue` requires a `coco-logger.Logger`. We
   provide a tiny `stdLogger` that forwards to stdlib `log.Printf` rather
   than pulling in the file-logger transitively.
3. **Task ID generation.** The library's `Publish` does not return a task
   ID. The façade generates a 16-byte hex ID and calls `PublishWithID`, then
   returns the ID to the caller — needed so HTTP handlers can hand the ID to
   the frontend for polling.

## Adding a new queue

The marketplace install handler in `src/plugins/queue/handlers.go` is the
worked example. To add another queue, do the same four steps:

### 1. Define a JSON-serialisable payload type

```go
type MyJobPayload struct {
    ResourceID int64  `json:"resourceId"`
    Mode       string `json:"mode"`
}
```

Keep payloads small and self-contained — they are persisted in SQLite as
JSON. Reference foreign keys, not full structs.

### 2. Write a `RegisterX` function in `handlers.go`

```go
const myJobQueue = "myjob.something"

func RegisterMyJob(rawManager *cocoqueue.DefaultManager, deps ...) error {
    if _, err := rawManager.CreateQueue(myJobQueue, "Description"); err != nil {
        return err
    }
    return registerMyJobWorker(rawManager, deps...)
}

func RegisterMyJobWorker(rawManager *cocoqueue.DefaultManager, deps ...) error {
    return registerMyJobWorker(rawManager, deps...)
}

func registerMyJobWorker(rawManager *cocoqueue.DefaultManager, deps ...) error {
    worker := func(_ context.Context, payload []byte) error {
        var task MyJobPayload
        if err := json.Unmarshal(payload, &task); err != nil {
            return fmt.Errorf("decode payload: %w", err)
        }
        // …do the work, return error to retry, nil on success
        return nil
    }
    cfg := cocoqueue.Config{ /* see below */ }
    return rawManager.Register(myJobQueue, worker, cfg)
}
```

The `Register` / `RegisterWorker` split exists because `coco-queue.CreateQueue`
is not idempotent (see *Operational notes* below). On second start, server
wiring detects the queue already exists and calls the `Worker`-only variant
to attach the in-memory worker pool without re-creating the row.

### 3. Wire it into `server.NewRouter`

In `src/plugins/server/server.go`, after `qManager` is constructed:

```go
queues, _ := qManager.Raw().ListQueues()
exists := false
for _, q := range queues {
    if q.Name == "myjob.something" { exists = true; break }
}
if exists {
    err = queue.RegisterMyJobWorker(qManager.Raw(), deps...)
} else {
    err = queue.RegisterMyJob(qManager.Raw(), deps...)
}
if err != nil { return …, err }
```

### 4. Publish from your HTTP handler

```go
taskID, err := qManager.Publish("myjob.something", MyJobPayload{...})
```

Return the `taskID` to the frontend so it can poll `Status(taskID)` via the
status endpoint.

### Avoiding import cycles

If your worker depends on a type from the `handler` package and a sibling
HTTP handler depends on `queue.Manager`, you will hit a Go import cycle.
Resolve it the same way the marketplace install does: declare a small local
interface in the `queue` package describing only what the worker needs, and
let the concrete type satisfy it structurally:

```go
// in src/plugins/queue/handlers.go
type PluginInstaller interface {
    InstallFromZip(zipBytes []byte, force bool) (model.Manifest, error)
}
```

The `*handler.PluginInstaller` concrete type satisfies this without import
or change.

## Configuration knobs

Each queue is registered with a `cocoqueue.Config`:

| Field         | Meaning                                                                                  | Marketplace install value |
| ------------- | ---------------------------------------------------------------------------------------- | ------------------------- |
| `BufferSize`  | In-memory channel capacity between dispatcher and workers.                               | `64`                      |
| `MaxAttempts` | Total attempts including the first try. After this, the task moves to `dead_lettered`.  | `4`                       |
| `Backoff`     | `[]time.Duration` of pad delays between attempts. Index `i` is the wait before retry `i+1`. | `[2s, 10s, 60s]`          |
| `Workers`     | Number of concurrent workers for this queue. Caps in-flight parallelism.                | `2`                       |

For marketplace installs, two workers means at most two installs run in
parallel. The backoff array of three values combined with `MaxAttempts: 4`
yields one initial attempt plus three retries spaced 2 s, 10 s and 60 s apart
— roughly 72 seconds of total retry budget before dead-lettering.

## Operational notes

### Database location

Per-queue SQLite files live under `<userDataDir>/queue/`. For the
t-digi-posseidon Wails app, `userDataDir` is the OS-conventional app data
directory (e.g. `~/Library/Application Support/t-digi-posseidon/` on macOS).

Wiping queue state in development:

```sh
rm -rf "<userDataDir>/queue/"
```

This deletes all queues, all task rows and the registry. The host re-creates
everything on next start.

### Crash recovery

If the host crashes mid-job:

- Tasks in `pending` stay pending; workers pick them up on next start.
- Tasks in `in_progress` are returned to the worker pool on next start
  (the library's startup recovery scans for stale in-progress rows).

This recovery is automatic — there is no manual step.

Plugin queue workers are also restored on crash recovery. Worker closures for every registered plugin queue are re-attached during `server.NewRouter` startup, before the HTTP routes open. Tasks that were `in_progress` when the host crashed are re-enqueued by cocoqueue's own startup recovery and immediately dispatched to the re-attached closures.

### Retry semantics

`MaxAttempts` is the total number of tries, including the first. `Backoff` pads each retry; index `i` is the delay before retry `i+1`. If `Backoff` is shorter than `MaxAttempts-1`, the last entry is reused for trailing retries. Once attempts are exhausted, the task moves to `dead_lettered` and stays there. There is currently no automatic re-drive from dead-letter; surface it in admin tooling if needed.

### Inspecting a stuck task

```sh
sqlite3 "<userDataDir>/queue/<queueName>.db" \
  "SELECT id, status, attempts, last_error FROM queue_tasks ORDER BY created_at DESC LIMIT 20;"
```

Replace `<queueName>` with e.g. `marketplace-install`. The exact filename
follows the registry's naming convention — `ls "<userDataDir>/queue/"` to
confirm.

### Shutdown

`server.NewRouter` returns a `queue.StopFunc` alongside the HTTP mux. The
host stashes it on the `App` struct (`App.queueStop`) and calls it as the
first step of `App.Shutdown` with a 15-second timeout. This lets in-flight
workers finish or cancel cleanly before the SQLite handles close.

`BeforeClose` is **not** the right hook for queue stop in this Wails app —
it is a vetoing hook (returning `true` cancels the close). Use `Shutdown`,
which is the actual destructor.

## HTTP endpoints

The marketplace install flow exposes two endpoints:

### `POST /api/plugins/marketplace/install`

Enqueues a marketplace install job. The trust gate (untrusted-not-confirmed
→ 409 with `code: "untrusted"`) fires at this boundary, **before** anything
is enqueued.

Request:

```json
{ "repoId": 1, "pluginId": "snake", "confirmUntrusted": false }
```

Response (200):

```json
{ "taskId": "9f3a1b…", "status": "pending" }
```

Response (409, untrusted):

```json
{ "code": "untrusted", "message": "…" }
```

### `GET /api/plugins/marketplace/install/status?taskId=<id>`

Returns the task's current state. 404 if `taskId` is not known.

Response (200):

```json
{ "taskId": "9f3a1b…", "status": "in_progress", "attempts": 1, "lastError": "" }
```

`status` is one of `pending`, `in_progress`, `completed`, `failed`,
`dead_lettered`.

## Plugin queue API

Plugins can create their own named queues and register a consumer for them.
All routes are gated on the plugin being active (404 if not installed, 403 if deactivated).
Standard envelope: `{"status":"success","message":{...}}` on success; `{"status":"Error","message":"..."}` on failure.

### Queue naming rules

Every plugin queue name **must** start with `<pluginID>_` (e.g. `mhype_enrich`).
Allowed characters: `[a-z0-9._:-]`. Names colliding with host-internal queues (e.g. `marketplace-install`) are rejected.

### Routes

| Method | Path | Description |
|---|---|---|
| `POST`   | `/api/plugins/{id}/queues` | Register a queue + consumer (required together). |
| `GET`    | `/api/plugins/{id}/queues` | List the plugin's own queues with counts. |
| `DELETE` | `/api/plugins/{id}/queues/{name}` | Unregister the consumer; detach workers. |
| `POST`   | `/api/plugins/{id}/queues/{name}/publish` | Enqueue a task. |
| `GET`    | `/api/plugins/{id}/queues/{name}/tasks/{task_id}` | Task status. |

### Registration

`POST /api/plugins/{id}/queues`

```json
{
  "name": "mhype_enrich",
  "description": "Enrich newly-crawled items",
  "consumer": {
    "action": "queue_enrich",
    "workers": 2,
    "maxAttempts": 4,
    "backoffMillis": [2000, 10000, 60000],
    "bufferSize": 64
  }
}
```

`consumer` is **required** — a queue without a consumer cannot be registered. Returns 409 if the queue is already registered.

Defaults if omitted: `workers=1`, `maxAttempts=3`, `backoffMillis=[1000,5000,30000]`, `bufferSize=1024`.

### Worker invocation contract

When cocoqueue dequeues a task, the host invokes the plugin binary with:

```json
{
  "action": "queue_enrich",
  "payload": { ...the published payload... },
  "_queue": { "name": "mhype_enrich" }
}
```

This is the same `{action, params}` envelope the plugin's existing `dispatch` already handles. The plugin should add a case for the queue action:

- Return `{"result": ...}` → task marked **completed**.
- Return `{"error": "some message"}` → task **retried** (up to `maxAttempts`), then dead-lettered.

### Persist across restarts

Registrations are stored in `plugin_queue_registrations` inside `plugins.db`. On host startup, all rows are replayed: existing cocoqueue queue rows have their worker closures re-attached. Plugins do **not** need to re-register after a host restart.

A plugin typically registers its queues once, during its first activation. Subsequent calls to `POST /api/plugins/{id}/queues` with the same name return 409.

### Unregister

`DELETE /api/plugins/{id}/queues/{name}` sets the worker pool to 0 and removes the registration row. The `cocoqueue` queue row is **not** deleted (the library does not expose queue deletion). The queue appears in Settings → Queues as inactive with its historical task counts until a future cleanup mechanism is added.

On plugin uninstall, all queue registrations for the plugin are removed and their workers are detached.

### Settings → Queues

Plugin queues appear automatically in the Settings → Queues UI (which polls `/api/queue/overview` every 5 s). No additional UI work is needed. The `pluginID_` prefix in the queue name makes ownership visible at a glance.

## Frontend usage

The TypeScript client is in
[`frontend/src/api/marketplace.ts`](../../frontend/src/api/marketplace.ts):

```ts
export type MarketplaceJobState =
  | 'pending' | 'in_progress' | 'completed' | 'failed' | 'dead_lettered';

export interface MarketplaceJobStatus {
  taskId: string;
  status: MarketplaceJobState;
  attempts: number;
  lastError: string;
}

installFromMarketplace(repoId, pluginId, confirmUntrusted?): Promise<{ taskId: string }>;
getMarketplaceJobStatus(taskId): Promise<MarketplaceJobStatus>;
```

[`frontend/src/components/Plugin/Marketplace.tsx`](../../frontend/src/components/Plugin/Marketplace.tsx)
holds the polling loop:

- A single `setInterval(1500)` poll, started on the first install and shared
  across all in-flight tasks.
- An in-flight map keyed by `${repoId}:${pluginId}`.
- Terminal states (`completed` / `failed` / `dead_lettered`) remove the
  entry, re-fetch the catalog, and dispatch `plugins:changed`.
- A 5-minute cap per task as a safety net; the job stays in the queue if
  the cap is hit.
- The interval is cleared on component unmount.

[`frontend/src/components/Plugin/MarketplaceCard.tsx`](../../frontend/src/components/Plugin/MarketplaceCard.tsx)
accepts an optional `progress` prop and renders an inline spinner with a
labelled state ("Pending…", "Installing…", "Retrying… (attempt N)") while a
job is in flight.

## Tradeoffs and known limitations

- **Module size.** `coco-queue` pulls in `coco-logger` and `coco-orm` as
  transitive deps. Acceptable for the durability we get; revisit if either
  module grows substantially.
- **Go toolchain.** `coco-queue` requires `go 1.26.0`; the host's `go.mod`
  is bumped accordingly. CI must run on Go 1.26+.
- **Library docs are sparse.** API was inferred from the library's source.
  The façade isolates this risk — a future swap is a local change.
- **Migrations live in the host.** `coco-queue` does not ship migrations,
  so we own them under `src/plugins/queue/migrations/`. If the upstream
  schema changes, our embedded SQL needs to track it.
- **`CreateQueue` is not idempotent.** Server wiring uses `ListQueues()` to
  pre-check on second startup and routes to the worker-only registration
  path.
- **Retries cannot be classified.** A malformed ZIP retries `MaxAttempts`
  times even though it will never succeed. Acceptable for v1
  (~72 s of wasted retry budget). If this becomes painful, expose a
  permanent-error sentinel in the worker contract.

### Out of scope (for now)

- Per-task progress percent.
- Cancellation of an in-flight task.
- A multi-queue admin UI listing all tasks.
