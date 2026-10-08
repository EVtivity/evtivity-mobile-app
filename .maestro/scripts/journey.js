// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Charging journey helper for the Maestro flows (runScript). Maestro runs it on
// the host, not on the device, so it reaches the CSMS API directly. It drives
// the station simulator through /v1/css/actions as an operator, and reads the
// driver's session through the portal API to check what the app must show.
//
// Written in ES5 so it runs on both Maestro script engines (GraalJS, Rhino).
// Maestro provides http, json and output. Every value below comes from the
// flow env (runScript env or `maestro test -e`); a missing value uses the
// local demo stack default.
//
// STEP:
//   prepare  checks the driver has no active session and pays as BILLING says
//            (card: the simulated payment provider is active, and a saved card
//            exists, added with the simulated test card when there is none),
//            then plugs the EV in at STATION_ID / EVSE_ID
//   session  stores the id of the driver's active session at the station
//   suspend  suspendCharging by the EV (SuspendedEV)
//   resume   resumeCharging
//   unplug   unplugs the EV, which ends the transaction (EVDisconnected)
//   final    checks the session completed with a cost above 0, and stores
//            a regex of that cost for the app's amount
//   settled  card: the payment is captured for the final cost.
//            account: there is no card payment and the fleet bill is unbilled
//
// Results go to output.journey (sessionId, costPattern).

// Maestro defines each env value as a global variable. A top-level `this` is
// the global object on both engines, so a value that is not set reads as
// undefined instead of throwing a ReferenceError.
var GLOBALS = this;

function envOr(name, fallback) {
  var value = GLOBALS[name];
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

var API = envOr('API_URL', 'http://localhost:7102');
var STEP = envOr('STEP', '');
var STATION = envOr('STATION_ID', 'CS-0001');
var EVSE = Number(envOr('EVSE_ID', '1'));
var BILLING = envOr('BILLING', 'card');
var DRIVER = {
  email: envOr('EMAIL', 'driver@evtivity.local'),
  password: envOr('PASSWORD', 'driver123'),
};
var ADMIN = {
  email: envOr('ADMIN_EMAIL', 'admin@evtivity.local'),
  password: envOr('ADMIN_PASSWORD', 'admin123'),
};

if (output.journey === undefined) {
  output.journey = {};
}
var state = output.journey;

function fail(message) {
  throw new Error('journey ' + STEP + ': ' + message);
}

function call(method, path, token, body) {
  var headers = { 'x-client': 'mobile' };
  if (token) headers.authorization = 'Bearer ' + token;
  var res;
  if (method === 'GET') {
    res = http.get(API + path, { headers: headers });
  } else {
    headers['content-type'] = 'application/json';
    res = http.post(API + path, {
      headers: headers,
      body: JSON.stringify(body === undefined ? {} : body),
    });
  }
  var parsed = null;
  try {
    parsed = res.body ? json(res.body) : null;
  } catch (e) {
    parsed = null;
  }
  return { status: res.status, body: parsed };
}

function ok(res) {
  return res.status >= 200 && res.status < 300;
}

function describe(res) {
  var b = res.body || {};
  return res.status + ' ' + (b.code || b.error || '');
}

function login(path, creds, key) {
  if (state[key]) return state[key];
  var res = call('POST', path, null, creds);
  var token = res.body && (res.body.token || res.body.accessToken);
  if (!ok(res) || !token) fail('sign-in ' + path + ' ' + describe(res));
  state[key] = token;
  return token;
}

function adminToken() {
  return login('/v1/auth/login', ADMIN, 'adminToken');
}

function driverToken() {
  return login('/v1/portal/auth/login', DRIVER, 'driverToken');
}

function simulator(action, extra) {
  var body = { stationId: STATION, evseId: EVSE };
  if (extra) {
    for (var k in extra) body[k] = extra[k];
  }
  var res = call('POST', '/v1/css/actions/' + action, adminToken(), body);
  if (!ok(res)) fail('simulator ' + action + ' ' + describe(res));
}

function activeSessions() {
  var res = call('GET', '/v1/portal/chargers/sessions/active', driverToken());
  if (!ok(res)) fail('active sessions ' + describe(res));
  return (res.body && res.body.data) || [];
}

function randomId() {
  var hex = '';
  for (var i = 0; i < 32; i++) hex += Math.floor(Math.random() * 16).toString(16);
  return (
    hex.slice(0, 8) +
    '-' +
    hex.slice(8, 12) +
    '-4' +
    hex.slice(13, 16) +
    '-a' +
    hex.slice(17, 20) +
    '-' +
    hex.slice(20)
  );
}

function ensureCard() {
  var provider = call('GET', '/v1/settings/payments', adminToken());
  if (!ok(provider)) fail('payment settings ' + describe(provider));
  if (provider.body.provider !== 'simulated') {
    fail(
      'payments.provider is ' +
        provider.body.provider +
        ', the card journey needs the simulated provider (Settings > Payments)',
    );
  }
  var token = driverToken();
  var cards = call('GET', '/v1/portal/payment-methods', token);
  if (!ok(cards)) fail('payment methods ' + describe(cards));
  if (cards.body.length > 0) return;
  var intent = call('POST', '/v1/portal/payment-methods/setup-intent', token, {});
  if (!ok(intent)) fail('setup intent ' + describe(intent));
  var saved = call('POST', '/v1/portal/payment-methods/setup/submit', token, {
    provider: 'simulated',
    attemptId: randomId(),
    payload: { testCard: '4242424242424242' },
  });
  if (!ok(saved)) fail('save card ' + describe(saved));
}

function sessionDetail() {
  if (!state.sessionId) fail('no session id, run STEP=session first');
  var res = call('GET', '/v1/portal/sessions/' + state.sessionId, driverToken());
  if (!ok(res)) fail('session ' + describe(res));
  return res.body;
}

// The amount in any locale: the digits of the major unit, a decimal point or
// comma, and the two minor digits (12.34, 12,34). Group separators are not
// expected: a test session costs far less than 1000.
function costPattern(cents) {
  var major = String(Math.floor(cents / 100));
  var minor = String(cents % 100);
  if (minor.length < 2) minor = '0' + minor;
  return '.*' + major + '[.,]' + minor + '.*';
}

if (STEP === 'prepare') {
  state.sessionId = undefined;
  state.costPattern = undefined;
  if (activeSessions().length > 0) fail('the driver already has an active session');
  var me = call('GET', '/v1/portal/auth/me', driverToken());
  if (!ok(me)) fail('driver profile ' + describe(me));
  var mode = (me.body.billing && me.body.billing.mode) || 'card';
  if (mode !== BILLING) fail('the driver pays by ' + mode + ', the flow expects ' + BILLING);
  if (BILLING === 'card') ensureCard();
  simulator('plugIn');
} else if (STEP === 'session') {
  var sessions = activeSessions();
  var found = null;
  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].stationId === STATION) found = sessions[i];
  }
  if (found === null) fail('no active session at ' + STATION);
  state.sessionId = found.id;
} else if (STEP === 'suspend') {
  // suspendCharging and resumeCharging need a CSMS whose simulator has them
  // (see TESTING.md).
  simulator('suspendCharging', { by: 'EV' });
} else if (STEP === 'resume') {
  simulator('resumeCharging');
} else if (STEP === 'unplug') {
  simulator('unplug');
} else if (STEP === 'final') {
  var ended = sessionDetail();
  if (ended.status !== 'completed') fail('session is ' + ended.status + ', expected completed');
  if (!(ended.finalCostCents > 0)) fail('final cost is ' + ended.finalCostCents);
  state.costPattern = costPattern(ended.finalCostCents);
} else if (STEP === 'settled') {
  var s = sessionDetail();
  if (BILLING === 'card') {
    if (!s.payment || s.payment.status !== 'captured') {
      fail('payment is ' + (s.payment ? s.payment.status : 'missing') + ', expected captured');
    }
    if (s.payment.capturedAmountCents !== s.finalCostCents) {
      fail('captured ' + s.payment.capturedAmountCents + ', final cost ' + s.finalCostCents);
    }
  } else {
    if (s.payment) fail('a fleet session has a card payment (' + s.payment.status + ')');
    if (!s.accountBilling || s.accountBilling.state !== 'unbilled') {
      fail('fleet billing is ' + (s.accountBilling ? s.accountBilling.state : 'missing'));
    }
  }
} else {
  fail('unknown STEP');
}
