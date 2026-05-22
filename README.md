# keryx-lis-tester

A mock LIS (Location Information Server) that speaks HELD (RFC 5985). It
impersonates a real LIS so the Call Handling app can be exercised against
controlled location responses — well-formed civic and geodetic, partial,
malformed, slow, oversized, and erroring — without touching production.

The same endpoint serves any of 26 canned scenarios. The caller picks which
one each request gets back by attaching a scenario id — no server-side state
changes between tests.

## Requirements

- Node.js 20+

## Install and run

```bash
npm install
npm run dev
```

The server listens on `http://localhost:8088` by default.

## How it works

- One endpoint: `POST /` accepting `Content-Type: application/held+xml`
- Scenario selection precedence:
  1. `X-Scenario:` request header
  2. `?scenario=` query parameter
  3. `DEFAULT_SCENARIO` env (default `civic-us`)
- Unknown scenario id → `400` JSON `{error, scenario, available}`
- Every successful response sets the scenario's declared `Content-Type`
- Bodies are templated per request (see Dynamic responses below)
- A "request inspector" parses `<locationType>` and `<responseTime>` from the
  incoming `locationRequest` (best-effort) and includes them in the log line

## Dynamic responses

`civic-us`, `civic-extended`, and every `geo-*` scenario (plus `slow-*` which
reuse the civic-us body) are **dynamic California-based** — each request picks
a real California address from a curated dataset (~30 well-known landmarks
across the state) and substitutes its coordinates and civic fields into the
response.

This means two consecutive `POST / -H 'X-Scenario: civic-us'` requests return
**different** civic addresses. `geo-mixed` always pairs the civic address with
the matching lat/lon (both come from the same picked location).

Template variables available in scenario XML:

| Variable           | Value                                  |
|--------------------|----------------------------------------|
| `{{timestamp}}`    | Current ISO-8601 timestamp             |
| `{{latitude}}`     | Picked location's latitude             |
| `{{longitude}}`    | Picked location's longitude            |
| `{{altitude}}`     | Altitude in metres (currently fixed)   |
| `{{country}}`      | Always `US`                            |
| `{{state}}`        | Always `CA`                            |
| `{{county}}`       | Picked location's county               |
| `{{city}}`         | Picked location's city                 |
| `{{streetNumber}}` | House number                           |
| `{{streetName}}`   | Street name                            |
| `{{streetSuffix}}` | Street type (St, Ave, Blvd, etc.)      |
| `{{postalCode}}`   | California ZIP (starts with `9`)       |
| `{{building}}`     | Building / venue name                  |
| `{{floor}}`        | Floor designation                      |
| `{{room}}`         | Room / suite                           |
| `{{placeType}}`    | office, public, hotel, etc.            |
| `{{name}}`         | Tenant / organisation                  |
| `{{landmark}}`     | Nearby landmark                        |
| `{{polygonPosList}}` | 4-corner closed ring ±0.001° around centre |

Unknown placeholders throw at render time — typos in scenario XML fail loud.

The remaining scenarios (`civic-international`, `civic-minimal`, `partial-*`,
`error-*`, `http-*`, `empty-body`, `wrong-content-type`, `malformed-xml`,
`oversized`) are **static by design** — their purpose is parser-stressing or
edge-case coverage where determinism matters.

## Example calls

```bash
# Default scenario (civic-us)
curl -X POST http://localhost:8088/ \
  -H 'Content-Type: application/held+xml' \
  --data-binary '<?xml version="1.0"?><locationRequest xmlns="urn:ietf:params:xml:ns:geopriv:held"/>'

# Pick a scenario by header
curl -X POST http://localhost:8088/ \
  -H 'Content-Type: application/held+xml' \
  -H 'X-Scenario: geo-circle' \
  --data-binary @request.xml

# Pick a scenario by query parameter
curl -X POST 'http://localhost:8088/?scenario=malformed-xml' \
  -H 'Content-Type: application/held+xml' \
  --data-binary @request.xml

# Trigger an HTTP-level error
curl -i -X POST http://localhost:8088/ \
  -H 'Content-Type: application/held+xml' \
  -H 'X-Scenario: http-503' \
  --data-binary '<r/>'
```

## Scenarios

Run `npm run scenarios` to print the live list. By category:

**Civic** — well-formed civic addresses
- `civic-us` — standard US (HNO, RD, STS, A3, A1, PC)
- `civic-international` — Canada (CA, ON, Toronto)
- `civic-minimal` — country + A1 only
- `civic-extended` — adds BLD, FLR, ROOM, SEAT, PLC, NAM, LMK, PCN, ADDCODE

**Geodetic** — well-formed GML shapes
- `geo-point` — `gml:Point` 2D (EPSG:4326)
- `geo-point-3d` — `gml:Point` 3D with altitude (EPSG:4979)
- `geo-circle` — `gs:Circle` with metre radius
- `geo-polygon` — `gml:Polygon` closed ring
- `geo-arcband` — `gs:ArcBand` sector
- `geo-mixed` — civic + geodetic in the same tuple

**Partial / missing-field** — parser leniency
- `partial-no-timestamp` — omits `<timestamp>`
- `partial-no-method` — omits `<gp:method>`
- `partial-no-confidence` — no RFC 7459 `<conf:*>` elements
- `partial-empty-location-info` — self-closing `<gp:location-info/>`

**HELD-level errors** (HTTP 200, body is HELD `<error code="…">`)
- `error-locationUnknown`
- `error-timeout`
- `error-notLocatable`

**HTTP-level errors** (status code only, empty body)
- `http-404`, `http-500`, `http-503`

**Edge cases**
- `empty-body` — 200 OK, zero bytes
- `wrong-content-type` — valid HELD served as `text/plain`
- `malformed-xml` — truncated mid-element
- `oversized` — ~256 KB padded body (configurable, see env)

**Delays**
- `slow-2s`, `slow-10s` — civic-us body after a 2 / 10 second wait

## Environment variables

| Variable           | Default      | Effect                                         |
|--------------------|--------------|------------------------------------------------|
| `PORT`             | `8088`       | HTTP listen port                               |
| `HOST`             | `0.0.0.0`    | HTTP listen address                            |
| `LOG_LEVEL`        | `info`       | pino level (`silent` … `trace`)                |
| `DEFAULT_SCENARIO` | `civic-us`   | Returned when no `X-Scenario` / `?scenario=`   |
| `OVERSIZED_KB`     | `256`        | Size of the `oversized` scenario body in KB    |

## Health check

```bash
curl http://localhost:8088/health
# {"status":"ok"}
```

## Postman collection

A ready-to-import Postman v2.1 collection lives in [`postman/`](postman/):

- `postman/keryx-lis-tester.postman_collection.json` — every scenario as its
  own request, grouped into folders (Health, Civic, Geodetic, Partial /
  missing-field, HELD errors, HTTP errors, Edge cases, Delays). Each request
  is pre-configured with the right `Content-Type` and `X-Scenario` headers,
  a sample HELD `locationRequest` body, and a test script that asserts the
  expected status code.
- `postman/keryx-lis-tester.postman_environment.json` — environment with
  `baseUrl` set to `http://localhost:8088`.

Import both into Postman (File → Import). Then select the "LIS Tester —
local" environment and start firing requests.

The collection is **generated from the catalog**, so when scenarios are
added or removed the files stay in sync:

```bash
npm run postman
```

## Development

```bash
npm run dev          # start with file watching
npm test             # run the vitest suite
npm run test:watch   # vitest in watch mode
npm run typecheck    # tsc --noEmit
npm run check        # typecheck + test
npm run coverage     # vitest with v8 coverage
npm run scenarios    # print the catalog
npm run postman      # regenerate the Postman collection + environment
```

## Project layout

```
src/
├── server.ts             # buildServer(config)
├── main.ts               # CLI entry — bootstraps the server
├── config.ts             # env parsing
├── heldEndpoint.ts       # POST / handler — registers content-type, delegates to registry
├── requestInspector.ts   # best-effort parse of incoming locationRequest for logs
├── template.ts           # {{placeholder}} substitution
└── scenarios/
    ├── catalog.ts        # scenario list + dynamic oversized body
    ├── registry.ts       # loadRegistry(catalog, dir) → { get, list }
    ├── resolver.ts       # X-Scenario → ?scenario → default
    ├── format.ts         # formatCatalog() for the CLI listing
    └── *.xml             # one file per static scenario
```

## Adding a scenario

1. Drop the XML body in `src/scenarios/your-id.xml` (use `{{timestamp}}`
   anywhere you want the current time).
2. Add an entry to the `catalog` array in [src/scenarios/catalog.ts](src/scenarios/catalog.ts):
   ```ts
   {
     id: "your-id",
     file: "your-id.xml",
     description: "Human-readable purpose.",
     // optional: status, contentType, delayMs, bodyProvider
   }
   ```
3. (Optional) add a behavioural test alongside the other category tests
   in `src/scenarios/*.test.ts`.

## Notes

- **Strict Content-Type on requests.** Fastify rejects POST bodies without
  `Content-Type: application/held+xml` (returns 415). This matches RFC 5985,
  so the Call Handling app should be sending it anyway. For manual curl
  testing, always pass the header.
- **`slow-*` scenarios hold the connection open.** Any HTTP client with a
  default timeout below the delay will give up — that's the point.
- **`oversized` is generated in memory** when the registry loads. Restart the
  server after changing `OVERSIZED_KB`.
