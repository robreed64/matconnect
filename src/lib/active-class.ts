export function selectActiveClass<T extends { id: number; startTime: Date; endTime: Date }>(
  classes: T[],
  now: Date,
): T | null {
  const active = classes.filter(
    (c) => c.startTime <= now && c.endTime >= now,
  );
  if (active.length === 0) return null;
  return active.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];
}
