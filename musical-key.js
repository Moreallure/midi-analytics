// musical-key.js
// Real-time musical key estimation via the Krumhansl-Schmuckler key-finding
// algorithm, with exponential time-decay (so modulations / new pieces win out
// over old material) and hysteresis (so the estimate doesn't flicker between
// neighbouring keys). Exposes a global `MusicalKeyEstimator`; classic script to
// match the rest of this codebase.

// Krumhansl-Kessler tonal hierarchies (canonical). Index 0 == tonic.
var KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
var KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

var PC_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function _pearson(a, b) {
    var n = a.length;
    var sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
    for (var i = 0; i < n; i++) {
        sa += a[i]; sb += b[i];
        saa += a[i] * a[i]; sbb += b[i] * b[i]; sab += a[i] * b[i];
    }
    var den = Math.sqrt((n * saa - sa * sa) * (n * sbb - sb * sb));
    return den === 0 ? 0 : (n * sab - sa * sb) / den;
}

// Expected profile for a key whose tonic pitch class is `t`: pitch class `t`
// receives the tonic weight (profile[0]).
function _rotated(profile, t) {
    var out = new Array(12);
    for (var i = 0; i < 12; i++) out[i] = profile[(i - t + 12) % 12];
    return out;
}

function MusicalKeyEstimator(options) {
    options = options || {};
    // ponytail: calibration knobs left open — real-time music is a tuning
    // problem, the right values depend on playing style and tempo.
    this.lambda = options.lambda != null ? options.lambda : 0.05;          // decay per second (half-life ~14s)
    this.minNotes = options.minNotes != null ? options.minNotes : 8;       // ignore estimates before this much material
    this.switchThreshold = options.switchThreshold != null ? options.switchThreshold : 5; // consecutive wins needed to switch
    this.margin = options.margin != null ? options.margin : 0.015;         // winner must beat current by this correlation margin
    this.reset();
}

MusicalKeyEstimator.prototype.reset = function () {
    this.profile = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.currentIdx = null;      // 0..23: 0-11 major, 12-23 minor (tonic = idx % 12)
    this.candidateIdx = null;
    this.candidateCount = 0;
    this.lastTime = null;
};

MusicalKeyEstimator.prototype.addNote = function (midi) {
    var now = performance.now();
    if (this.lastTime != null) {
        var decay = Math.exp(-((now - this.lastTime) / 1000) * this.lambda);
        for (var i = 0; i < 12; i++) this.profile[i] *= decay;
    }
    this.lastTime = now;
    this.profile[((midi % 12) + 12) % 12] += 1;
};

MusicalKeyEstimator.prototype.keyName = function (idx) {
    var t = idx % 12;
    return idx < 12 ? PC_NAMES[t] + " major" : PC_NAMES[t] + " minor";
};

MusicalKeyEstimator.prototype.estimate = function () {
    var total = 0;
    for (var i = 0; i < 12; i++) total += this.profile[i];
    if (total < this.minNotes) {
        return this.currentIdx == null ? null : this.keyName(this.currentIdx);
    }

    var scores = new Array(24);
    for (var t = 0; t < 12; t++) {
        scores[t] = _pearson(this.profile, _rotated(KS_MAJOR, t));
        scores[t + 12] = _pearson(this.profile, _rotated(KS_MINOR, t));
    }

    var bestIdx = 0;
    for (var j = 1; j < 24; j++) if (scores[j] > scores[bestIdx]) bestIdx = j;

    if (this.currentIdx === null) {
        this.currentIdx = bestIdx;
        return this.keyName(bestIdx);
    }
    if (bestIdx === this.currentIdx) {
        this.candidateCount = 0;
        return this.keyName(this.currentIdx);
    }
    // Different candidate — only commit once it is persistent AND clearly stronger.
    if (this.candidateIdx !== bestIdx) {
        this.candidateIdx = bestIdx;
        this.candidateCount = 1;
    } else {
        this.candidateCount++;
    }
    if (this.candidateCount >= this.switchThreshold &&
        scores[bestIdx] - scores[this.currentIdx] > this.margin) {
        this.currentIdx = bestIdx;
        this.candidateIdx = null;
        this.candidateCount = 0;
    }
    return this.keyName(this.currentIdx);
};

// ponytail: one runnable self-check, no framework. Open ?mktest to run it.
function _musicalKeySelfTest() {
    var assert = function (cond, msg) { if (!cond) throw new Error("musical-key self-test failed: " + msg); };

    // C major scale (C D E F G A B), each note evenly.
    var cMaj = [60, 62, 64, 65, 67, 69, 71];
    var e = new MusicalKeyEstimator();
    for (var k = 0; k < 6; k++) for (var n = 0; n < cMaj.length; n++) { e.addNote(cMaj[n]); e.estimate(); }
    assert(e.estimate() === "C major", "expected C major, got " + e.estimate());

    // A minor, emphasising the tonic + minor-third + fifth triad (A C E),
    // which is what disambiguates a key from its relative major.
    var aMin = [57, 60, 64, 57, 60, 64, 57, 60, 64, 59, 62, 65, 67];
    e = new MusicalKeyEstimator();
    for (var m = 0; m < 6; m++) for (var p = 0; p < aMin.length; p++) { e.addNote(aMin[p]); e.estimate(); }
    assert(e.estimate() === "A minor", "expected A minor, got " + e.estimate());

    // Modulation: establish C major, then drift to G major (G A B C D E F#).
    e = new MusicalKeyEstimator();
    for (var c = 0; c < 4; c++) for (var n2 = 0; n2 < cMaj.length; n2++) { e.addNote(cMaj[n2]); e.estimate(); }
    assert(e.estimate() === "C major", "modulation baseline not C major");
    var gMaj = [67, 69, 71, 60, 62, 64, 66];
    for (var g = 0; g < 25; g++) for (var q = 0; q < gMaj.length; q++) { e.addNote(gMaj[q]); e.estimate(); }
    assert(e.estimate() === "G major", "expected modulation to G major, got " + e.estimate());

    console.log("musical-key self-test OK");
}

if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("mktest")) {
    _musicalKeySelfTest();
}

window.MusicalKeyEstimator = MusicalKeyEstimator;
