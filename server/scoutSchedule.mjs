const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function localParts(timestamp, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(timestamp);
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
}

export function validateTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat('en', { timeZone }).format(0);
    return timeZone;
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    throw new Error('timeZone must be a valid IANA time zone.');
  }
}

export function nextWatchRun(localTime, timeZone, after = Date.now()) {
  if (!TIME.test(localTime)) throw new Error('localTime must use HH:mm.');
  validateTimeZone(timeZone);
  const [hour, minute] = localTime.split(':');
  const start = Math.floor(after / 60_000) * 60_000 + 60_000;
  for (let offset = 0; offset < 3 * 24 * 60; offset++) {
    const candidate = start + offset * 60_000;
    const parts = localParts(candidate, timeZone);
    if (parts.hour === hour && parts.minute === minute) return candidate;
  }
  throw new Error('Could not resolve the next scheduled watch run.');
}
