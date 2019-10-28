let start_test = false;

if (start_test) {
    // TEST PARAMETERS
    let n_iterations = 1000;
    let batch_size = 5;
    let relax_f = 0.8;  // Ratio of relaxed vs stressed samples
    let alpha = 0.01;
    let gamma = 0.1;

    // TEST BEGIN
    let reasoner = new EasyReadingReasoner(alpha, 'q_learning', 3, gamma);
    reasoner.testing = true;
    let n_relaxed = Math.ceil(n_iterations * relax_f);

    let n_correct = 0;
    let n_dialogs = 0;
    for (let i = 0; i < n_iterations; i++) {
        let sample = null;
        let action = null;
        let fix = null;
        if (i < n_relaxed) {
            fix = 'low';
        } else {
            fix = 'high';
        }
        sample = getRandomSample(fix);
        action = reasoner.step(sample);
        reasoner.waitForUserReaction();
        // Mock feedback waiting loop
        for (let k = 0; k < batch_size; k++) {
            let sample_after = getRandomSample(fix);
            reasoner.step(sample_after);
        }
        if (action !== null) {
            reasoner.setHumanFeedback(sample.label);
        }
        if (good_action(action, sample.label)) {
            n_correct++;
        }
        if (action === EasyReadingReasoner.A.askUser) {
            n_dialogs++;
        }
    }

    console.log('Accuracy: ' + n_correct / n_iterations);
    console.log('User asked: ' + n_dialogs + ' times.');
}

function good_action(action, label) {
    let good = false;
    if (label === 'help' && action === 'showhelp') {
        good = true;
    } else if (label === 'ok' && (action === 'nop' || action === 'ignore')) {
        good = true;
    }
    return good;
}
