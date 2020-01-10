let start_test = false;

if (start_test) {
    // TEST PARAMETERS
    let n_iterations = 500;
    let batch_size = 5;
    let relax_f = 0.8;  // Ratio of relaxed vs stressed samples
    let weave_f = 0.1; // Percentage of samples of the same label to send in a burst
    let error_f = 0.15; // Prob. of adding a sample of the opposite label in current burst
    let alpha = 0.01;
    let gamma = 0.1;
    // TESTS BEGIN
    let params = [n_iterations, batch_size, relax_f, weave_f, error_f];
    let reasoner_q = new EasyReadingReasoner('q_learning', alpha, 3, 0, 0, gamma, 0.2, 1);
    let reasoner_d_q = new EasyReadingReasoner('q_learning', alpha, 3, 0, 0, gamma, 0.2, 0.5);
    let reasoner_d_q_c = new EasyReadingReasoner('q_learning', alpha, 3, 0, 0, gamma, 0.2, 0.9); // Best
    let reasoner_d_q_c_2 = new EasyReadingReasoner('q_learning', alpha, 3, 0, 0, gamma, 0.2, 0.95);
    run_tests([reasoner_q, reasoner_d_q, reasoner_d_q_c, reasoner_d_q_c_2], params);
}

async function run_tests(agents, test_config) {
    // Initialize variables
    let [n_iterations, batch_size, relax_f, weave_f, error_f] = test_config;
    for (let i=0; i<agents.length; i++) {
        agents[i].testing = true;
    }
    let n_relaxed = Math.ceil(n_iterations * relax_f);
    let n_burst = Math.ceil(n_iterations * weave_f);
    let new_burst = true;
    let n_correct = [];
    let n_dialogs = [];
    let line_series = [];
    let actions = [];
    let labels = [];
    let predictions = [];
    let agent_types = [];
    for (let i=0; i<agents.length; i++) {
        n_correct.push(0);
        n_dialogs.push(0);
        line_series.push([]);
        actions.push('');
        predictions.push([]);
        agent_types.push((i+1) + ': ' + agents[i].model_type);
    }
    // Run training iterations
    let u_status = null;
    for (let t = 0; t < n_iterations; t++) {
        let sample = null;
        if (weave_f < 1) {
            new_burst = t % n_burst === 0;
            if (new_burst) {
                if (Math.random() < relax_f) {
                    u_status = 'ok';
                } else {
                    u_status = 'confused';
                }
            }
        } else {
            if (t < n_relaxed) {
                u_status = 'ok';
            } else {
                u_status = 'confused';
            }
        }
        let st_final = u_status;
        if (Math.random() <= error_f) {
            st_final = u_status === 'ok' ? 'confused' : 'ok';
        }
        // Fetch sample and guess next action
        sample = getRandomSample(st_final);
        labels.push(sample.label);
        for (let a=0; a<agents.length; a++) {
            actions[a] = agents[a].step(sample);
            agents[a].waitForUserReaction();
        }
        // Mock feedback waiting loop
        for (let k = 0; k < batch_size; k++) {
            let sample_after = getRandomSample(u_status);
            for (let a=0; a<agents.length; a++) {
                agents[a].step(sample_after);
            }
        }
        // Give human feedback according to sample label and update model
        for (let a=0; a<agents.length; a++) {
            if (actions[a] !== null) {
                agents[a].setHumanFeedback(sample.label);
                let pred = actionToLabel(actions[a]);
                predictions[a].push(pred);
                if (pred === sample.label) {
                    n_correct[a]++;
                }
                line_series[a].push({x:t, y:n_correct[a]/(t+1)});
                if (pred === EasyReadingReasoner.A.askUser) {
                    n_dialogs[a]++;
                }
            }
        }
    }

    // Render accuracy evolution
    const data = {values: line_series, series:agent_types};
    const surface = { name: 'Accuracy per time step', tab: 'charts' };
    tfvis.render.linechart(surface, data, {
        xAxisDomain : [0, n_iterations-1],
        yAxisDomain : [0, 1],
        xLabel: 'timestep',
        yLabel: 'accuracy',
        height: 300 });

    // Print basic stats and confusion matrices
    const labels_t = tf.tensor1d(labels.map(labeltoInt));
    for (let a=0; a<agents.length; a++) {
        console.log('Stats for ' + agents[a].model_type + ':');
        console.log('--- Accuracy: ' + n_correct[a] / n_iterations);
        console.log('--- User Asked: ' + n_dialogs[a] + ' times.');
        console.log('\n');
        let surface_cm = { name: 'Confusion Matrix ' + (a+1), tab: 'charts' };
        let labels_p = tf.tensor1d(predictions[a].map(labeltoInt));
        let cmatrix = await tfvis.metrics.confusionMatrix(labels_t, labels_p);
        let data_cm = {
            values: cmatrix,
            tickLabels: ['OK', 'Help', 'Ask User'],
        };
        tfvis.render.confusionMatrix(surface_cm, data_cm);
    }
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
