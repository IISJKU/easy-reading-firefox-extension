class EasyReadingReasoner {

    active = true;
    model = null;
    alpha = 0.01;

    user_status = EasyReadingReasoner.user_S.relaxed;  // Estimation of user's current status
    user_s_new = false;
    waiting_feedback = false;  // Whether reasoner is waiting for user feedback

    IDLE_TIME = 5000;  // User idle time (ms) before inferring user reward
    BUFFER_SIZE = 5;
    s_buffer = Array(BUFFER_SIZE);  // States buffer


    constructor (step_size) {
        this.alpha = step_size;
        this.loadModel();
    }

    /**
     * Action set
     */
    static get A() {
        return {'nop': 'nop', 'askUser': 'askuser', 'showHelp': 'showhelp'};
    }

    /**
     * User states
     */
    static get user_S() {
        return {'relaxed': 'relaxed', 'confused': 'confused', 'unsure': 'unsure'};
    }

    loadModel(n_features, m_type='perceptron') {
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
            return EasyReadingReasoner.A.nop;
        }
        if (!this.w && !this.model) {
            this.w = tf.zeros([1, labels.length], 'float32');
        }
        let action = EasyReadingReasoner.A.askUser;  // TODO change to nop

        let n = this.s_buffer.push(features);
        if (n > this.BUFFER_SIZE) {
            this.s_buffer.shift();
        }

        if (! this.waiting_feedback) {
            let state = this.aggregateStates();
            if (state) {
                // action = model.action()
                this.waiting_feedback = true;
                let start = performance.now();
                let this_reasoner = this;
                let feedback = null;
                while (this.waiting_feedback) {
                    setTimeout(function() {
                        let end = performance.now();
                        if (end - start >= IDLE_TIME) {
                            this_reasoner.waiting_feedback = false;
                            feedback = "ok";
                        }
                    }, 500);
                }
                // updateAgent();
            }
        }

        return action;
    };



    /**
     * Update current user status according to human feedback
     * @param feedback: "help" or "ok" (help not needed)
     */
    setHumanFeedback(feedback) {
        let user_status = EasyReadingReasoner.user_S.relaxed;
        if (feedback === "help") {
            user_status = EasyReadingReasoner.user_S.confused;
        }
        let reward = this.humanFeedbackToReward(user_status);
        this.waiting_feedback = false;
        return reward;
    }

    aggregateStates() {
        let aggregated = [];
        let n_s = this.s_buffer.length;
        if (n_s === 1) {
            aggregated = this.s_buffer;
        } else if (n_s > 1) {
            for (let i=0; i<this.s_buffer.length; i++) {
                let s_i = this.s_buffer[i];
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
}
