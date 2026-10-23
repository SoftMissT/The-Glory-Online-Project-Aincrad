export function poolPercent(pool) {
    const value = Number(pool?.value);
    const max = Number(pool?.max);
    if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}
export function healthTone(percent) {
    if (percent <= 25) return 'critical';
    if (percent <= 50) return 'warning';
    return 'safe';
}
