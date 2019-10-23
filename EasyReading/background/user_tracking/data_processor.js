/**
 * Pre-process a given sample so it fits the expected format
 */
function preProcessSample(labels, sample) {
    let sample_clean = [];
    let n_labels = labels.length;
    let n_features = sample.length;
    if (n_features && n_features === n_labels) {
        for (let i=0; i<n_features; i++) {
            let feature_name = labels[i];
            if (feature_name !== 'timestamp') {
                let value = sample[i];
                let clean_value = null;
                if (feature_name === 'fixation_ms') {
                    clean_value = bin_fixation_ms(value);
                } else if (feature_name === 'blink_ms') {
                    clean_value = bin_blink_ms(value);
                } else if (feature_name === 'blink_rate') {
                    clean_value = processRate(value);
                }
                if (clean_value) {
                    sample_clean.push(clean_value);
                } else {
                    sample_clean.push(value);  // Push feature value as-is
                }
            }
        }
    }
    return sample_clean;
}

/**
 * Bin a given eye fixation duration into categories
 * @param fix_ms: float; fixation duration in milliseconds.
 * @returns {string} Binned category
 */
function bin_fixation_ms(fix_ms) {
    if (fix_ms >= 1000.0) {
        return 'very_long';
    } else if (fix_ms > 500.0) {
        return 'long';
    } else if (fix_ms > 200.0) {
        return 'normal';
    } else if (fix_ms > 1.0) {
        return 'short';
    } else {
        return 'zero';
    }
}

/**
 * Bin a given eye blink duration into categories
 * @param blink_ms: float; blink duration in milliseconds.
 * @returns {string} Binned blink duration category
 */
function bin_blink_ms(blink_ms) {
    if (blink_ms >= 100.0) {
        return 'very_long';
    } else if (blink_ms > 50.0) {
        return 'long';
    } else if (blink_ms > 30) {
        return 'normal';
    } else if (blink_ms > 1.0) {
        return 'short';
    } else {
        return 'zero';
    }
}

/**
 * Clean a give rate trend value to an integer between -1 and 1 (inclusive)
 * @param rate: rate value
 * @returns {number}: clear rate value (1 for rate increase, -1 for rate decrease, 0 for steady rate)
 */
function processRate(rate) {
    let clean_value = Math.floor(rate);
    if (clean_value < -1) {
        clean_value = -1.0;
    } else if (clean_value > 1) {
        clean_value = 1.0;
    }
    return clean_value;
}

/**
 * Return a random sample for testing purposes
 * @param fixation: 'high' or 'low'; Random with 80% low chance if empty
 * @returns: Sample object
 */
function getRandomSample(fixation) {
    if (!fixation) {
        fixation = Math.random() < 0.8 ? 'high' : 'low';
    }
    let ts = new Date().toLocaleString();
    let base_fix = 1000.0;
    let blink_rate = 0.0;
    if (fixation === 'low') {
        base_fix = 200.0;
        blink_rate = 1.0;
    }
    let fix_tensor_base = tf.scalar(base_fix);
    let fix_t = fix_tensor_base.add(tf.randomNormal([1], 0, 200, 'float32'));
    let blink_t = tf.randomNormal([1], 50, 15, 'float32');
    let fix_val = fix_t.dataSync()[0];
    if (fix_val < 0) {
        fix_val = 0;
    }
    return {
        'timestamp': ts,
        'fixation_ms': fix_val,
        'blink_ms': blink_t.dataSync()[0],
        'blink_rate': blink_rate
    };
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}
