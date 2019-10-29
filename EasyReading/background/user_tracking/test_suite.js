let start_test = false;

if (start_test) {
    // TEST PARAMETERS
    let n_iterations = 200;
    let batch_size = 5;
    let relax_f = 0.8;  // Ratio of relaxed vs stressed samples
    let weave_f = 0.1; // Percentage of samples of the same label to send in a burst
    let error_f = 0.15; // Prob. of adding a sample of the opposite label in current burst
    let alpha = 0.01;
    let gamma = 0.1;

    // TEST BEGIN
    let reasoner = new EasyReadingReasoner(alpha, 'q_learning', 3, gamma);
    reasoner.testing = true;
    let n_relaxed = Math.ceil(n_iterations * relax_f);
    let n_burst = Math.ceil(n_iterations * weave_f);
    let new_burst = true;
    let n_correct = 0;
    let n_dialogs = 0;
    let line_series = [];
    let labels = [];
    let predictions = [];
    let u_status = null;
    for (let i = 0; i < n_iterations; i++) {
        let sample = null;
        let action = null;
        if (weave_f < 1) {
            new_burst = i % n_burst === 0;
            if (new_burst) {
                if (Math.random() < relax_f) {
                    u_status = 'ok';
                } else {
                    u_status = 'confused';
                }
            }
        } else {
            if (i < n_relaxed) {
                u_status = 'ok';
            } else {
                u_status = 'confused';
            }
        }
        let st_final = u_status;
        if (Math.random() <= error_f) {
            st_final = u_status === 'ok' ? 'confused' : 'ok';
        }
        sample = getRandomSample(st_final);
        action = reasoner.step(sample);
        reasoner.waitForUserReaction();
        // Mock feedback waiting loop
        for (let k = 0; k < batch_size; k++) {
            let sample_after = getRandomSample(u_status);
            reasoner.step(sample_after);
        }
        if (action !== null) {
            reasoner.setHumanFeedback(sample.label);
        }
        let pred = actionToLabel(action);
        if (pred === sample.label) {
            n_correct++;
        }
        labels.push(sample.label);
        predictions.push(pred);
        line_series.push({x:i, y:n_correct/(i+1)});
        if (action === EasyReadingReasoner.A.askUser) {
            n_dialogs++;
        }
    }

    console.log('Accuracy: ' + n_correct / n_iterations);
    console.log('User asked: ' + n_dialogs + ' times.');

    // Render accuracy evolution
    /*const data = {values: [line_series]};
    const surface = { name: 'Accuracy per time step', tab: 'charts' };
    tfvis.render.linechart(surface, data, {
        xAxisDomain : [0, n_iterations-1],
        yAxisDomain : [0, 1],
        xLabel: 'timestep',
        yLabel: 'accuracy',
        height: 300 });*/

    // Render confusion matrix
    /*const labels_t = tf.tensor1d(labels.map(labeltoInt));
    const labels_p = tf.tensor1d(predictions.map(labeltoInt));
    const cmatrix = await tfvis.metrics.confusionMatrix(labels_t, labels_p);
    const data_cm = {
        values: cmatrix,
        tickLabels: ['OK', 'Help', 'Ask User'],
    };
    const surface_cm = { name: 'Confusion Matrix', tab: 'charts' };
    tfvis.render.confusionMatrix(surface_cm, data_cm);*/
}

function labeltoInt(label) {
    let label_int = 2;
    if (label === 'ok') {
        label_int = 0;
    } else if (label === 'help') {
        label_int = 1;
    }
    return label_int;
}

function actionToLabel(action) {
    let label = action;
    if (action === 'showhelp') {
        label = 'help';
    } else if (action === 'nop' || action === 'ignore') {
        label = 'ok';
    }
    return label;
}
