class EasyReadingReasoner {

    is_active = true;
    model = null;
    alpha = 0.01;

    set active(active) {
        this.is_active = active;
        if (active) {
            console.log("Reasoner enabled");
        } else {
            console.log("Reasoner disabled");
            this.resetStatus();
        }
    }

    get active() {
        return this.is_active;
    }

    user_status = EasyReadingReasoner.user_S.relaxed;  // Estimation of user's current status
    reward = 0;
    waiting_feedback = false;  // Whether reasoner is waiting for user feedback (feedback may be implicit)
    collect_t = "before";  // Whether status being received refers to before or after feedback obtained

    IDLE_TIME = 10000;  // User idle time (ms) before inferring user reward
    BUFFER_SIZE = 5;
    s_buffer = [];  // Buffer of states before feedback
    s_next_buffer = [];  // Buffer of states after feedback


    constructor (step_size) {
        this.alpha = step_size;
        this.loadModel();
    }

    /**
     * Action set
     */
    static get A() {
        return {'nop': 'nop', 'askUser': 'askuser', 'showHelp': 'showhelp', 'ignore': 'ignore'};
    }

    /**
     * User states
     */
    static get user_S() {
        return {'relaxed': 'relaxed', 'confused': 'confused', 'unsure': 'unsure'};
    }

    /**
     * Resets model current state, n.b. not model parameters!
     */
    resetStatus() {
        this.waiting_feedback = false;
        this.collect_t = "before";
        this.reward = 0;
        this.s_buffer = [];
        this.s_next_buffer = [];
        console.log("Reasoner status reset. Collecting new user state");
    }

    loadModel(n_features, m_type='perceptron') {
        this.resetStatus();
        if (m_type === 'sequential') {
            this.loadSequentialModel();
        } else {
            this.model = null;
            this.w = null;  // Simple perceptron; no initialization needed
        }
    }

    loadSequentialModel() {
        this.model = tf.sequential();
        this.model.add(tf.layers.dense({units: 100, activation: 'relu', inputShape: [10]}));
        this.model.add(tf.layers.dense({units: 1, activation: 'linear'}));
        this.model.compile({optimizer: 'sgd', loss: 'meanSquaredError'});
        console.log(this.model);
        /*
        const xs = tf.randomNormal([100, 10]);
        const ys = tf.randomNormal([100, 1]);
        this.model.fit(xs, ys, {
                    epochs: 100,
                    callbacks: {
                        onEpochEnd: (epoch, log) => console.log(`Epoch ${epoch}: loss = ${log.loss}`)
                    }
        });*/
    }

    /**
     * Take an step given the current state and model
     * @param message An object (a single observation from tracking data) with feature labels as keys and feature
     * vector as values
     * @returns {string} Action to take next
     */
    step (message) {
        const labels = Object.keys(message);  // Array keys; not sample labels!
        const features = Object.values(message);
        if (!labels || !features) {
            return EasyReadingReasoner.A.ignore;
        }
        let sample = this.preProcessSample(labels, features);
        if (!sample) {
            return EasyReadingReasoner.A.ignore;
        }
        if (!this.w && !this.model) {
            this.w = tf.zeros([1, labels.length], 'float32');
        }
        let action = null;
        // Push sample to corresponding buffer
        if (this.collect_t === "before") {
            let n = this.s_buffer.push(features);
            if (n > this.BUFFER_SIZE) {
                this.s_buffer.shift();
            }
            if (! this.waiting_feedback) {
                let state = this.aggregateStates(this.s_buffer);
                if (state) {
                    action = this.randomAction(state);  // TODO change to sgd
                    console.log("Reasoner action: " + action);
                    this.collect_t = "after";
                    console.log("Collecting next state");
                    this.waiting_feedback = true;
                }
            }
        } else {
            let n = this.s_next_buffer.push(features);
            if (n > this.BUFFER_SIZE) {
                this.s_next_buffer.shift();
            }
        }
        return action;
    };

    /**
     * Simple model for testing purposes; returns a random action regardless of state
     * @param state
     * @returns {string}
     */
    randomAction(state) {
        let action = EasyReadingReasoner.A.askUser;
        // return action;
        let rand = Math.random();
        if (rand > 0.5) {
            if (rand < 0.75) {
                action = EasyReadingReasoner.A.nop;
            } else {
                action = EasyReadingReasoner.A.showHelp;
            }
        }
        return action
    }

    waitForUserReaction() {
        let start = performance.now();
        let this_reasoner = this;
        this.collect_t = "after";
        console.log("Collecting next state (waiting for user's reaction)");

        function timeout () {
            setTimeout(function () {
                if (this_reasoner.waiting_feedback) {
                    let end = performance.now();
                    if (end - start >= this_reasoner.IDLE_TIME) {
                        console.log("Reasoner: user idle. Assuming everything OK.");
                        this_reasoner.setHumanFeedback("ok");
                    } else {
                        timeout();
                    }
                }
            }, 500);
        }

        timeout();
    };

    /**
     * Update current user status according to human feedback
     * @param feedback: "help" or "ok" (help not needed)
     */
    setHumanFeedback(feedback) {
        this.waiting_feedback = false;
        let user_status = EasyReadingReasoner.user_S.relaxed;
        if (feedback === "help") {
            user_status = EasyReadingReasoner.user_S.confused;
        }
        this.reward = this.humanFeedbackToReward(user_status);
        console.log("Reasoner: setting reward to " + this.reward);
        this.user_status = user_status;
        this.updateModel();
    }

    updateModel() {
        // TODO: update here according to this.s_buffer, this.s_next_buffer, and this.reward
        this.collect_t = "before";
        this.s_buffer = [];
        this.s_next_buffer = [];
        console.log("Reasoner model updated. Collecting new user state");
    }

    /**
     * Aggregate buffered states into a single state by averaging over all timesteps
     * @param buffer: array of past states; shape (timesteps x n_features)
     * @returns {Array}: aggregated state; shape (1 x n_features)
     */
    aggregateStates(buffer) {
        let aggregated = [];
        let n_s = buffer.length;
        if (n_s === 1) {
            aggregated = buffer;
        } else if (n_s > 1) {
            console.log("Reasoner: aggregating " + n_s + " user states.");
            for (let i=0; i<buffer.length; i++) {
                let s_i = buffer[i];
                if (s_i.length > 0) {
                    let sum, avg = 0;
                    sum = s_i.reduce(function(a, b) { return a + b; });
                    avg = sum / s_i.length;
                    aggregated.push(avg);
                }
            }
        }
        return aggregated;
    }

    /**
     * Clean useless features (e.g. timestamp) from a sample and ensure that all features are present in it
     */
    preProcessSample(labels, sample) {
        let sample_clean = [];
        let n_labels = labels.length;
        let n_features = sample.length;
        if (n_features && n_features === n_labels) {
            for (let i=0; i<n_features; i++) {
                if (labels[i] !== 'timestamp') {
                    sample_clean.push(sample[i]);
                }
            }
        }
        return sample_clean;
    }

    /**
     * Compare human-given feedback with current estimation of user mood and return a corresponding numeric reward
     * @param feedback: User mood as selected by the user (confused/relaxed)
     * @returns {number}: A numeric reward signal, the higher the better. Especially rewards detecting confusion.
     */
    humanFeedbackToReward(feedback) {
        let reward = 0.0;
        if (feedback === EasyReadingReasoner.user_S.confused) {
            if (this.user_status === EasyReadingReasoner.user_S.confused) {
                reward = 100.0;
            } else if (this.user_status === EasyReadingReasoner.user_S.relaxed) {
                reward = -100.0;
            } else {
                reward = -10.0;
            }
        } else if (feedback === EasyReadingReasoner.user_S.relaxed) {
            if (this.user_status === EasyReadingReasoner.user_S.confused) {
                reward = -10.0;
            } else if (this.user_status === EasyReadingReasoner.user_S.relaxed) {
                reward = 0.001;
            } else {
                reward = -10.0;
            }
        }
        return reward;
    }


    /**
     * Return a random sample for testing purposes
     * @param fixation: 'high' or 'low'; Random with 80% low chance if empty
     * @returns: Sample object
     */
    getRandomSample(fixation) {
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
}
