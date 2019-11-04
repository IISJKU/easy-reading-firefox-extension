class EasyReadingReasoner {

    model_type = 'none';
    is_active = true;
    testing = false;
    model = null;
    alpha = 0.01; // Step size
    gamma = 0.1; // Discount factor
    eps = 0.1;  // Epsilon for e-greedy policies
    eps_decay = 1;  // Epsilon decay factor (applied on each timestep)
    episode_length = 20;  // Timesteps before ending episode
    ucb = 0; // Upper-Confidence-Bound Action Selection constant

    set active(active) {
        if (this.testing) {
            this.is_active = false;
        } else {
            this.is_active = active;
            if (active) {
                console.log("Reasoner enabled");
            } else {
                console.log("Reasoner disabled");
                this.resetStatus();
            }
        }
    }

    get active() {
        return this.is_active;
    }

    user_status = EasyReadingReasoner.user_S.relaxed;  // Estimation of user's current status
    reward = 0;  // Reward obtained in current timestep
    s_curr = null;  // Current state (tensor)
    s_next = null;  // Next state (tensor)
    last_action = null;  // Last action taken
    t_current = 1;  // Current timestep
    waiting_feedback = false;  // Whether reasoner is waiting for user feedback (feedback may be implicit)
    collect_t = "before";  // Whether status being received refers to before or after feedback obtained
    feature_names = [];

    IDLE_TIME = 10000;  // User idle time (ms) before inferring user reward
    BUFFER_SIZE = 5;
    s_buffer = [];  // Buffer of states before feedback
    s_next_buffer = [];  // Buffer of states after feedback

    q_func_a = null;  // Action value function A for Q-learning: (n_states x n_features) tensor
    q_func_b = null;  // Action value function B for double Q-learning: (n_states x n_features) tensor

    constructor (step_size=0.01, model_type='perceptron', n_features=3, gamma=0.1, eps=0.1, eps_decay=1, ucb=0.0) {
        this.alpha = step_size;
        this.gamma = gamma;
        this.eps = eps;
        this.eps_decay = eps_decay;
        this.ucb = ucb;
        this.model_type = model_type;
        this.loadModel(n_features, model_type);
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
        this.t_current = 1;
        this.last_action = null;
        this.s_buffer = [];
        this.s_next_buffer = [];
        this.feature_names = [];
        console.log("Reasoner status reset. Collecting new user state");
    }

    loadModel(n_features, m_type='perceptron') {
        this.resetStatus();
        if (m_type === 'sequential') {
            this.loadSequentialModel(n_features);
        } else if (m_type.startsWith('q_learning') || m_type.startsWith('double_q_l')) {
            this.model = null;
            this.w = null;
            this.q_func_a = new ActionValueFunction(Object.values(EasyReadingReasoner.A),
                EasyReadingReasoner.A.askUser,
                this.ucb);
            if (m_type.startsWith('double_q_l')) {
                this.q_func_b = new ActionValueFunction(Object.values(EasyReadingReasoner.A),
                    EasyReadingReasoner.A.askUser,
                    this.ucb);
            }
            console.log('Q function initialized');
        } else {
            this.model = null;
            this.w = null;  // Simple perceptron; no initialization needed
        }
    }

    loadSequentialModel(n_features) {
        this.model = tf.sequential();
        this.model.add(tf.layers.dense({units: 32, activation: 'tanh', inputShape: [n_features]}));
        this.model.add(tf.layers.dense({units: 32, activation: 'tanh', inputShape: [n_features]}));
        this.model.add(tf.layers.dense({units: 1, activation: 'sigmoid'}));
        this.model.compile({optimizer: 'sgd', loss: 'meanSquaredError'});
        console.log('Model Loaded: ' + this.model);
    }

    /**
     * Take an step given the current state and model
     * @param message An object (a single observation from tracking data) with feature labels as keys and feature
     * vector as values
     * @returns {string} Action to take next; null if collecting next state's data
     */
    step (message) {
        let action = null;
        const labels = Object.keys(message);  // Array keys; not sample labels!
        const features = Object.values(message);
        if (!this.is_active || !labels || !features) {
            return EasyReadingReasoner.A.ignore;
        }
        this.feature_names = labels;  // Precondition: all messages carry same labels
        if (!this.w && !this.model && !this.q_func_a) {
            this.w = tf.zeros([1, labels.length], 'float32');
        }
        // Push sample to corresponding buffer
        if (this.collect_t === 'before') {
            let n = this.s_buffer.push(features);
            if (n > this.BUFFER_SIZE) {
                this.s_buffer.shift();
            }
            if (! this.waiting_feedback) {
                let state = preProcessSample(labels, this.aggregateStates(this.s_buffer));
                if (state) {
                    action = this.predict(state);
                    //console.log('Reasoner action: ' + action);
                    this.collect_t = 'after';
                    //console.log('Collecting next state');
                    this.waiting_feedback = true;
                }
            }
        } else {  // Collecting next state; take no action
            let n = this.s_next_buffer.push(features);
            if (n > this.BUFFER_SIZE) {
                this.s_next_buffer.shift();
            }
        }
        return action;
    }

    /**
     * Return an action prediction given the current state
     * @param state {Array}: current state of shape (1 x n_features)
     * @returns {string} an action from set A
     */
    predict(state) {
        let action = null;
        this.t_current++;
        if (state) {
            this.s_curr = tf.tensor1d(state);
            if (this.q_func_a && this.q_func_b) {
                action = this.q_func_a.epsGreedyCombinedAction(state, this.eps, this.q_func_b, this.t_current);
            } else if (this.q_func_a) {
                action = this.q_func_a.epsGreedyAction(state, this.eps, this.t_current);
            } else if (this.model) {
                action = this.model.predict(this.s_curr);
            }
        }
        if (!action) {
            action = this.randomAction();
        }
        // Update current guess of user's mood
        switch (action) {
            case EasyReadingReasoner.A.nop:
                this.user_status = EasyReadingReasoner.user_S.relaxed;
                break;
            case EasyReadingReasoner.A.showHelp:
                this.user_status = EasyReadingReasoner.user_S.confused;
                break;
            default:
                this.user_status = EasyReadingReasoner.user_S.unsure;
                break;
        }
        this.last_action = action;
        this.eps *= this.eps_decay;
        return action;
    }

    /**
     * Return a random action regardless of state; Asking user feedback has highest priority
     * @returns {string}
     */
    randomAction() {
        let action = EasyReadingReasoner.A.askUser;
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

    /**
     * Observe next state after having taken an action
     */
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
        this.s_next = tf.tensor1d(
            preProcessSample(
                this.feature_names,
                this.aggregateStates(this.s_next_buffer)
            )
        );
        this.updateModel();
    }

    updateModel() {
        if (this.q_func_a) {
            if (this.q_func_b) {
                this.updateDoubleQModel();
            } else {
                this.updateQModel();
            }
        }
        this.last_action = null;
        this.collect_t = 'before';
        this.s_buffer = [];
        this.s_next_buffer = [];
        if (this.t_current >= this.episode_length) {
            this.episodeEnd();
        }
        //console.log('Reasoner model updated. Collecting new user state');
    }

    updateQModel() {
        let q_target = this.reward + this.gamma * this.q_func_a.retrieveGreedy(this.s_next, this.t_current);
        let new_q_value = this.alpha * (q_target - this.q_func_a.retrieve(this.s_curr, this.last_action));
        this.q_func_a.update(this.s_curr, this.last_action, new_q_value);
    }

    updateDoubleQModel() {
        let to_update = 'a';
        if (Math.random() < 0.5) {
            to_update = 'b';
        }
        let q_target = 0.0;
        let new_q_value = 0.0;
        if (to_update === 'a') {
            q_target = this.reward +
                this.gamma * this.q_func_b.retrieve(this.s_next,
                    this.q_func_a.greedyAction(this.s_next, this.t_current));
            new_q_value = this.alpha * (q_target - this.q_func_a.retrieve(this.s_curr, this.last_action));
            this.q_func_a.update(this.s_curr, this.last_action, new_q_value);
        } else {
            q_target = this.reward +
                this.gamma * this.q_func_a.retrieve(this.s_next,
                    this.q_func_b.greedyAction(this.s_next, this.t_current));
            new_q_value = this.alpha * (q_target - this.q_func_b.retrieve(this.s_curr, this.last_action));
            this.q_func_b.update(this.s_curr, this.last_action, new_q_value);
        }
    }

    /**
     * Callback after an episode has ended
     */
    episodeEnd() {
        console.log('Episode ended');
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
            aggregated = buffer[0];
        } else if (n_s > 1) {
            let sample_length = buffer[0].length;
            console.log('Reasoner: aggregating ' + n_s + ' user states.');
            let combined = [];
            let i_skipped = new Set();
            for (let i=0; i<buffer.length; i++) {
                let s_i = buffer[i];
                if (s_i.length > 0) {
                    let row = [];
                    for (let j=0; j<sample_length; j++) {
                        if (s_i[j]==+s_i[j]) {  // Numerical value
                            row.push(s_i[j]);
                        } else {
                            i_skipped.add(j);
                        }
                    }
                    combined.push(row);
                }
            }
            let agg_num = combined[0].map((col, i) => combined.map(row => row[i]).reduce((acc, c) => acc + c, 0) /
                combined.length);
            for (let k=0; k<sample_length; k++) {
                if (i_skipped.has(k)) {
                    aggregated.push(buffer[buffer.length-1][k]);
                } else {
                    aggregated.push(agg_num.shift());
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
                reward = 10;
            } else if (this.user_status === EasyReadingReasoner.user_S.relaxed) {
                reward = -200.0;
            } else {
                reward = -10.0;
            }
        } else if (feedback === EasyReadingReasoner.user_S.relaxed) {
            if (this.user_status === EasyReadingReasoner.user_S.confused) {
                reward = -20.0;
            } else if (this.user_status === EasyReadingReasoner.user_S.relaxed) {
                reward = 1;
            } else {
                reward = -10.0;
            }
        }
        return reward;
    }

}
