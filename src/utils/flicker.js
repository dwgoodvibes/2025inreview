export function getFlickerBrightness(time) {
    // Deterministic pseudo-random noise based on time
    // We use high frequency sine waves to simulate randomness
    const noise = (Math.sin(time * 123.456) * 0.5 + 0.5) *
        (Math.cos(time * 234.567) * 0.5 + 0.5) * 2.0;

    // Normalize roughly to 0-1 range for the "random" variable (though it can spike)
    // Using a more chaotic hash would be better but this is smooth-ish which is nice for light

    // Actually, let's use a simpler hash for "is a spark happening now"
    // We want short, sharp spikes.

    // Hash function for [floor(time * speed)] to get consistent random value for that "frame" of time
    const speed = 20.0; // Changes 20 times a second
    const seed = Math.floor(time * speed);

    // Simple mulberry32-style or loose hash
    const t = seed + 0x6D2B79F5;
    let z = t;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    const randomValue = ((z ^ (z >>> 14)) >>> 0) / 4294967296;

    // Base ambient level - enough to see the lamp/table
    let brightness = 0.8;

    // Occasional spark
    if (randomValue > 0.95) {
        brightness = 0.8 + (randomValue * 8.0); // Much brighter sparks
    } else if (randomValue > 0.9) {
        brightness = 0.8 + (randomValue * 3.0); // Smaller spike
    }

    // Add the "breathing" effect
    brightness += (Math.sin(time * 0.5) * 0.05 + 0.05);

    return brightness;
}
