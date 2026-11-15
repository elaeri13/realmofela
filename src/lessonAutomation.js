// Scheduling is resolved on read; no teacher browser or daily database job is needed.
import { isSessionTile } from './currentSession.js';

export function schoolDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

export function scheduledReleaseConfig(settings, landId, today = schoolDate()) {
  const saved = settings.lessonRelease?.[landId] || {};
  const all = { ...(saved.enabled ? saved.all : {}) };
  for (const [tileId, entry] of Object.entries(settings.lessonSchedule?.[landId] || {})) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(entry.releaseDate || '') && entry.releaseDate <= today) all[tileId] = true;
  }
  return { ...saved, enabled: true, all, classes: saved.enabled ? saved.classes : {} };
}

export function scheduledCurrentSessions(settings, lands, classIds, today = schoolDate()) {
  let latest = null;
  for (const land of lands) {
    for (const tileId of land.pathOrder || []) {
      const tile = land.tiles.find(t => t.id === tileId);
      const date = settings.lessonSchedule?.[land.id]?.[tileId]?.releaseDate;
      if (!isSessionTile(land, tile) || !/^\d{4}-\d{2}-\d{2}$/.test(date || '') || date > today) continue;
      if (!latest || date >= latest.date) latest = { landId: land.id, tileId, date };
    }
  }
  return latest ? Object.fromEntries(classIds.map(id => [id, { landId: latest.landId, tileId: latest.tileId }])) : {};
}
