# Testing

## Checks

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

`npm test` runs the Jest unit tests. Coverage is enforced on `src/lib` only.

## UI flows (Maestro)

The flows in `.maestro/flows/` run against an app on a simulator or device
signed in as the demo driver (`driver@evtivity.local` / `driver123`).

```bash
.maestro/run.sh                       # every flow, one Maestro run each
MAESTRO_DEVICE=<udid> .maestro/run.sh # a specific device
maestro test .maestro/flows/01-login-success.yaml
```

## Charging journeys

The flows in `.maestro/journeys/` charge for real against a local EVtivity
stack. They are not part of `.maestro/run.sh`.

| Flow                  | Driver                        | Checks                                                                            |
| --------------------- | ----------------------------- | --------------------------------------------------------------------------------- |
| `charging-card.yaml`  | `driver@evtivity.local`       | saved card, start, charging, idle, charging, completed, final cost, captured      |
| `charging-fleet.yaml` | `fleet.driver@evtivity.local` | "Billed to" hint and no card, the same session states, unbilled on the fleet bill |

Each journey signs in, searches the station, starts a charge, and watches the
session screen. Between the app steps, `.maestro/scripts/journey.js` (Maestro
`runScript`, run on the host) drives the station simulator through the CSMS
API: it plugs the EV in, suspends charging by the EV (SuspendedEV), resumes,
and unplugs. It then checks the session on the server and gives the flow the
final cost, which the app must show on the session screen and in Activity.
The flows find every element by testID, so they pass in every app language.

### Requirements

- Xcode at the version [SETUP.md](./SETUP.md) lists, and the iOS app built
  with `npx expo run:ios` against the stack (`EXPO_PUBLIC_API_URL`).
- Maestro CLI 1.39 or later (`curl -Ls "https://get.maestro.mobile.dev" | bash`).
- An EVtivity CSMS Docker stack with demo data, its API on
  `http://localhost:7102`, and the station simulator in standby
  (`CSS_MODE=standby`), so no automatic traffic uses the station.
- A CSMS whose simulator has the `suspendCharging` and `resumeCharging`
  actions (`POST /v1/css/actions/<action>`). Without them the journey stops at
  the suspend step with the API error.
- Card journey: the simulated payment provider active (Settings > Payments,
  which needs `PAYMENTS_ALLOW_SIMULATED=true`) and payments enabled on the
  station's site. The helper adds the simulated test card 4242 to the driver
  when the driver has no saved card.
- Fleet journey: the demo fleet that bills its members on account.
- The driver has no active session. The helper refuses to start otherwise.

### Run

```bash
maestro test .maestro/journeys/charging-card.yaml
maestro test .maestro/journeys/charging-fleet.yaml
```

Overrides, all optional:

```bash
maestro test \
  -e API_URL=http://localhost:7102 \
  -e STATION_ID=CS-0001 -e EVSE_ID=1 \
  -e ADMIN_EMAIL=admin@evtivity.local -e ADMIN_PASSWORD=admin123 \
  .maestro/journeys/charging-card.yaml
```

`EMAIL` and `PASSWORD` set the card journey driver, `FLEET_EMAIL` and
`FLEET_PASSWORD` the fleet driver. The helper signs in as the operator to drive
the simulator and as the driver to read the session. Each run leaves one
completed session for the driver.
