import assert from 'node:assert/strict';
import test from 'node:test';
import { nextWatchRun, validateTimeZone } from './scoutSchedule.mjs';

test('nextWatchRun honors the saved IANA time zone', () => {
  const next = nextWatchRun('08:00', 'Asia/Ho_Chi_Minh', Date.parse('2026-09-21T00:30:00Z'));
  assert.equal(new Date(next).toISOString(), '2026-09-21T01:00:00.000Z');
});

test('nextWatchRun skips a nonexistent daylight-saving local time', () => {
  const next = nextWatchRun('02:30', 'America/New_York', Date.parse('2026-03-08T05:00:00Z'));
  assert.equal(new Date(next).toISOString(), '2026-03-09T06:30:00.000Z');
});

test('invalid time zones fail at the trust boundary', () => {
  assert.throws(() => validateTimeZone('Not/A_Time_Zone'), /valid IANA time zone/);
});
