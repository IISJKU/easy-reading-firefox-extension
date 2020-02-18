/**
 * Reasoner base class
 * @Class EasyReadingReasoner
 */
class EasyReadingReasoner {

    // Model hyper-parameters
    model_type = 'none';
    model = null;
    alpha = 0.01;  // Step size
    gamma = 0.1;  // Discount factor
    eps = 0.1;  // Epsilon for e-greedy policies
    eps_decay = 1;  // Epsilon decay factor (applied on each time step)
    episode_length = 20;  // Time steps before ending episode

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

    // Internal parameters
    id = -1;
    pid = -1;  // User profile ID
    is_active = true;  // Reasoner is disabled when tracking data not available e.g. AsTeRICS model not running
    is_paused = false;  // Reasoner is paused while cloud processes a request
    user_status = EasyReadingReasoner.user_S.relaxed;  // Estimation of user's current status
    reward = null;  // Reward obtained in current timestep
    s_curr = null;  // Current state (tensor)
    s_next = null;  // Next state (tensor)
    last_action = null;  // Last action taken
    user_action = null;  // Action actually taken by user
    t_current = 1;  // Current timestep
    waiting_start = null;
    waiting_feedback = false;  // Whether reasoner is waiting for user feedback (feedback may be implicit)
    collect_t = "before";  // Whether status being received refers to before or after feedback obtained
    feature_names = [];
    cancel_unfreeze = false;
    freeze_start = null;

    // Tracking parameters
    IDLE_TIME = 30000;  // User idle time (ms) before inferring user reward
    NEXT_STATE_TIME = 10000;  // Time to wait when collecting next state
    UNFREEZE_TIME = 300000;  // Time to automatically unfreeze paused reasoner (5 minutes)
    BUFFER_BEFORE_SIZE = 5;
    BUFFER_AFTER_SIZE = 5;
    s_buffer = [];  // Buffer of states before feedback
    s_next_buffer = [];  // Buffer of states after feedback
    gaze_info = [];  // User's gaze coordinates (relative to the viewport) of state being reasoned
    gaze_offsets = [];  // User's gaze offsets for x and y coordinates from screen origin to viewport origin
    stored_feedback = null;

    // Timeouts
    unfreezeTimeout = null;
    serializeTimeout = null;
    waitUserReactionTimeout = null;
    waitForFeedbackTimeout = null;
    collectNextStateTimeout = null;

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

    constructor (step_size=0.01, x_offset = 0, y_offset = 0, gamma=0.1, eps=0.1, eps_decay=1) {
        this.alpha = step_size;
        this.gamma = gamma;
        this.eps = eps;
        this.eps_decay = eps_decay;
        this.t_current = 1;
        this.gaze_offsets = [x_offset, y_offset];
    }

    load(id, pid, hyperparams) {
        // Copy hyper-parameters to this reasoner
        this.id = id;
        this.pid = pid;
        let this_reasoner = this;
        Object.keys(hyperparams).forEach(function(key) {
            if (this_reasoner.hasOwnProperty(key)) {
                this_reasoner[key] = hyperparams[key];
            }
        });
        if ('x_offset' in hyperparams && 'y_offset' in hyperparams) {
            this.gaze_offsets = [hyperparams.x_offset, hyperparams.y_offset];
        }
        this.model = null;
    }

    loadParams(params) {
        if ('model' in params) {
            this.model = params.model;
        }
    }

    async to_dict(include_params=true) {
        let hyperparams = {
            'alpha' : this.alpha,
            'gamma': this.gamma,
            'eps': this.eps,
            'eps_decay': this.eps_decay,
            'episode_length': this.episode_length,
        };
        if (this.gaze_offsets.length === 2) {
            hyperparams['x_offset'] = this.gaze_offsets[0];
            hyperparams['y_offset'] = this.gaze_offsets[1];
        }
        let dict_out = {
            'id': this.id,
            'pid': this.pid,
            'model_type': this.model_type,
            'hyperparams' : hyperparams,
        };
        if (include_params) {
            dict_out['params'] = {};
        }
        return dict_out;
    }

    async serialize() {
        let model_dict = await this.to_dict();
        return JSON.stringify(model_dict);
    }

    /**
     * Resets model current state, n.b. not model parameters!
     */
    resetStatus() {
        this.waiting_feedback = false;
        this.collect_t = "before";
        this.reward = null;
        this.last_action = null;
        this.user_action = null;
        this.s_buffer = [];
        this.s_next_buffer = [];
        this.feature_names = [];
        this.gaze_info = [];
        this.stored_feedback = null;
        this.unfreeze(false);
        this.waiting_start = null;
        this.clearTimeouts();
        // If there are any dialogs still open anywhere, close them
        for (let i=0; i<portManager.ports.length; i++) {
            portManager.ports[i].p.postMessage({
                type: "closeDialogs",
            });
        }
        console.log("Reasoner status reset. Collecting new user state");
    }

    clearTimeouts() {
        clearTimeout(this.unfreezeTimeout);
        clearTimeout(this.serializeTimeout);
        clearTimeout(this.waitUserReactionTimeout);
        clearTimeout(this.waitForFeedbackTimeout);
        clearTimeout(this.collectNextStateTimeout);
    }

    /**
     * Take an step given the current state and model
     * @param message An object (a single observation from tracking data) with feature labels as keys and feature
     * vector as values
     * @returns {string} Action to take next; null if collecting next state's data
     */
    step (message) {
        if (!this.is_active) {
            console.log('Ignore tracking data because reasoner disabled.');
            return EasyReadingReasoner.A.ignore;
        }
        if (this.is_paused) {
            // console.log('Ignore tracking data because reasoner paused.');
            return EasyReadingReasoner.A.ignore;
        }
        const labels = Object.keys(message);  // Array keys; not sample labels!
        const features = Object.values(message);
        if (!labels || !features) {
            return EasyReadingReasoner.A.ignore;
        }
        let action = null;
        this.feature_names = labels;  // Precondition: all messages carry same labels
        // Push sample to corresponding buffer
        if (this.collect_t === 'before') {
            let n = this.s_buffer.push(features);
            if (n > this.BUFFER_BEFORE_SIZE) {
                this.s_buffer.shift();
            }
            if (!this.waiting_feedback) {
                let state = preProcessSample(labels, this.aggregateStates(this.s_buffer));
                if (state) {
                    this.updateGazeInfo(labels);  // Save gaze position of current state
                    action = this.predict(state);
                }
            }
        } else {  // Collecting next state; take no action
            let n = this.s_next_buffer.push(features);
            if (n > this.BUFFER_AFTER_SIZE) {
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
            action = this.bestAction();
        }
        // Update current guess of user's mood
        switch (action) {
            case EasyReadingReasoner.A.nop:
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

    bestAction() {
        return EasyReadingReasoner.randomAction();
    }

    /**
     * Observe next state after having taken an action
     */
    waitForUserReaction() {
        this.startCollectingNextState();
        console.log("Collecting next state (waiting for user's reaction)");
        let this_reasoner = this;
        function timeout () {
            this_reasoner.waitUserReactionTimeout = setTimeout(function () {
                if (this_reasoner.waiting_feedback) {
                    let end = performance.now();
                    if (!this_reasoner.is_paused && end - this_reasoner.waiting_start >= this_reasoner.IDLE_TIME) {
                        console.log("Reasoner: user idle. Assuming prediction was correct or user OK.");
                        this_reasoner.setFeedbackAutomatically();
                    } else {
                        // console.log('Still waiting');
                        timeout();
                    }
                }
            }, 500);
        }
        if (this.waiting_start === null) {
            this.waiting_start = performance.now();
            timeout();
        } else {
            // Update start time on subsequent calls but do not start new timeout function
            this.waiting_start = performance.now();
        }
    };

    /**
     * When a tool is triggered, estimate implicit feedback according to how long it took user to cancel feedback
     */
    waitToEstimateFeedback() {
        let this_reasoner = this;
        let start = performance.now();
        this_reasoner.user_action = 'ok';
        function timeout () {
            if (this_reasoner.waitForFeedbackTimeout) {
                clearTimeout(this_reasoner.waitForFeedbackTimeout);
            }
            this_reasoner.waitForFeedbackTimeout = setTimeout(function () {
                if (this_reasoner.waiting_feedback) {
                    let end = performance.now();
                    if (!this_reasoner.is_paused && end - start >= this_reasoner.IDLE_TIME) {
                        this_reasoner.user_action = 'help';  // User did not cancel help after IDLE_TIME, it was needed
                    } else {
                        if (this_reasoner.is_paused) {
                            start = performance.now();
                        }
                        timeout();
                    }
                }
            }, 500);
        }
        timeout();
    }

    setFeedbackAutomatically() {
        if (this.user_action) {  // Known action: Update immediately
            if (this.reward === null) {
                this.setHumanFeedback(this.user_action);
            }
            this.updateModel();
        } else {  // Unknown action: infer from last taken action
            switch (this.last_action) {
                case EasyReadingReasoner.A.askUser:  // User remained idle during dialog --> assume OK
                case EasyReadingReasoner.A.nop:
                    this.setHumanFeedback("ok");
                    this.updateModel();
                    break;
                case EasyReadingReasoner.A.showHelp:
                    this.setHumanFeedback("help");
                    this.updateModel();
                    break;
            }
        }
    }

    /**
     * Compute reward and update current user status according to human feedback
     * @param feedback: "help" or "ok" (help not needed)
     */
    setHumanFeedback(feedback) {
        this.waiting_feedback = false;
        let user_status = EasyReadingReasoner.user_S.relaxed;
        if (feedback === "help") {
            user_status = EasyReadingReasoner.user_S.confused;
        }
        this.reward = this.humanFeedbackToReward(this.last_action, user_status);
        console.log("Got feedback " + feedback + ". Setting reward to " + this.reward);
        this.user_status = user_status;
    }


    /**
     * Update model according to current state (S), reward (R), and next state (S_next).
     * After updating the model, end current episode and start collecting S again.
     */
    updateModel() {
        if (this.last_action === null) {
            this.resetStatus();
            console.log('Trying to update model without an action. Resetting status.');
            return;
        }
        if (this.reward === null) {
            this.resetStatus();
            console.log('Trying to update model without a reward. Resetting status.');
            return;
        }
        let s_next = this.aggregateStates(this.s_next_buffer);
        if (s_next.length === 0) {
            console.log('Trying to update model without having collected S_next. Collecting S_next now.');
            this.collectNextStateAndUpdate();
            return;
        }
        this.s_next = tf.tensor1d(preProcessSample(this.feature_names, s_next));
        this.updateStep(this.last_action, this.reward);
        if (this.last_action === EasyReadingReasoner.A.askUser) {
            this.updateUntakenActionModel();
        }
        this.reward = null;
        this.last_action = null;
        this.user_action = null;
        this.collect_t = 'before';
        this.waiting_feedback = false;
        this.waiting_start = null;
        console.log('Copying S_next to S_current');
        this.s_buffer = this.s_next_buffer;
        this.s_next_buffer = [];
        if (this.t_current >= this.episode_length) {
            this.episodeEnd();
        }
    }

    updateStep(action, reward) {
        // Empty (update step performed by overridden subclass method)
    }

    /**
     * Update the model for an action taken by the user that was guessed incorrectly by the reasoner.
     */
    updateUntakenActionModel() {
        if (this.user_action) {
            // Compute reward as if reasoner had taken the right action
            let feedback = EasyReadingReasoner.user_S.relaxed;
            let action = EasyReadingReasoner.A.nop;
            if (this.user_action === "help") {
                feedback = EasyReadingReasoner.user_S.confused;
                action = EasyReadingReasoner.A.showHelp;
            }
            let reward = this.humanFeedbackToReward(action, feedback);
            // Incorporate additional knowledge about best action to the model
            this.updateStep(action, reward);
        }
    }

    /**
     * Handle the manual cancelling of a tool that was helping the user
     */
    setHelpCanceledFeedback() {
        if (this.last_action !== null) {
            if (this.user_action === "help") {
                console.log('User canceled own help request');
                this.setHumanFeedback("help");  // User was who triggered help, keep their feedback
            } else {
                console.log('User canceled automatic help');
                this.setHumanFeedback("ok");  // User cancelled automatically triggered help
            }
            this.updateModel();
        } else {
            console.log("setHelpCanceledFeedback: last action is null; resetting reasoner.");
            this.resetStatus();
        }
    }

    /**
     * Update the model after a long help has finished presenting its results
     */
    setHelpDoneFeedback() {
        if (this.last_action !== null) {
            this.setHumanFeedback("help");
            this.updateModel();
        } else {
            console.log("setHelpDoneFeedback: last action is null; resetting reasoner.");
            this.resetStatus();
        }
    }

    /**
     * Handles the sudden triggering of a tool by the user
     */
    handleToolTriggered(waitForPresentation) {
        console.log('toolTriggered: setting user action: help');
        this.user_action = 'help';  // User-triggered, so help needed
        if (waitForPresentation) {
            this.startCollectingNextState();
            this.waiting_feedback = false;  // Get feedback form presentation completed/cancelled
        } else {
            console.log("waiting for user reaction... (toolTriggered)");
            this.waitForUserReaction();
        }
    }

    /**
     * We already have S and R, start collecting S_next. Model update will be triggered externally.
     */
    startCollectingNextState() {
        console.log('Reasoner: collecting next state (S_next)');
        this.collect_t = 'after';
        this.waiting_feedback = true;
        if (this.s_next_buffer.length) {
            this.s_next_buffer = [];
        }
    }

    /**
     * We already have S and R, collect S_next and update
     */
    collectNextStateAndUpdate() {
        this.startCollectingNextState();
        let this_reasoner = this;
        let start = performance.now();
        function waitBeforeUpdate () {
            console.log('Setting timeout for S_next collection');
            this_reasoner.collectNextStateTimeout = setTimeout(function () {
                let end = performance.now();
                if (end - start >= this_reasoner.NEXT_STATE_TIME) {
                    console.log('Timeout; S_next collected. Updating model');
                    this_reasoner.updateModel();
                } else {
                    waitBeforeUpdate();
                }
            }, 500);
        }
        if (this.collect_t === 'after') {
            if (this_reasoner.collectNextStateTimeout) {
                clearTimeout(this_reasoner.collectNextStateTimeout);
            }
            waitBeforeUpdate();
        } else {
            this.resetStatus();  // This should never happen
            console.log('Trying to collect S_next but not possible. Resetting reasoner.');
        }
    }

    freeze() {
        console.log('Freezing reasoner');
        this.is_paused = true;
        let this_reasoner = this;
        function selfUnfreeze () {
            this_reasoner.unfreezeTimeout = setTimeout(function () {
                let end = performance.now();
                if (!this_reasoner.cancel_unfreeze) {
                    if (end - this_reasoner.freeze_start >= this_reasoner.UNFREEZE_TIME) {
                        console.log('Agent paused for too long. Resetting now.');
                        this_reasoner.resetStatus();
                        this_reasoner.cancel_unfreeze = false;
                    } else {
                        selfUnfreeze();
                    }
                } else {
                    this_reasoner.cancel_unfreeze = false;
                }
            }, 500);
        }
        if (this_reasoner.freeze_start === null) {
            this_reasoner.freeze_start = performance.now();
            selfUnfreeze();
        } else {
            // Update start time on subsequent calls to freeze(), but do not start new timeout function
            this_reasoner.freeze_start = performance.now();
        }
    }

    unfreeze(log=true) {
        if (log) {
            console.log('Unfreezing reasoner');
        }
        this.is_paused = false;
        if (this.freeze_start !== null) {
            this.cancel_unfreeze = true;
            clearTimeout(this.unfreezeTimeout);
        }
        this.freeze_start = null;
        if (this.waiting_start !== null) {
            this.waiting_start = performance.now();
        }
    }

    updateGazeInfo(labels) {
        this.gaze_info = get_gaze(labels, this.s_buffer, this.gaze_offsets[0], this.gaze_offsets[1]);
    }

    /**
     * Callback after an episode has ended
     */
    episodeEnd(saveToCloud=true) {
        console.log('Episode ended');
        if (saveToCloud) {
            if (this.id < 0) {
                this.sendSerializedModelToCloud('all');
            } else {
                this.sendSerializedModelToCloud('params');
            }
        }
    }

    /**
     * Serialize reasoner model (or its parameters) and send to cloud
     * @param what: what to serialize: only the model and its hyperparameters ('model'), only the current model's
     * parameters ('params'), or everything ('all')
     */
    sendSerializedModelToCloud(what='all') {
        let this_reasoner = this;
        if (this.serializeTimeout) {
            clearTimeout(this.serializeTimeout);
        }
        this.serializeTimeout = setTimeout(async function () {
            let model_str = '';
            let model_dict = null;
            let msg_type = 'persistReasoner';
            if (what === 'params') {
                msg_type = 'persistReasonerParams';
                model_dict = await this_reasoner.to_dict();
                let params_dict = {
                    'params': model_dict['params'],
                    'rid': this_reasoner.id,
                };
                model_str = JSON.stringify(params_dict);
            } else if(what === 'model') {
                model_dict = await this_reasoner.to_dict(false);
                model_str = JSON.stringify(model_dict);
            } else {
                model_str = await this_reasoner.serialize();
            }
            if (cloudWebSocket.isConnected) {
                let msg = {
                    type: msg_type,
                    reasoner_data: model_str,
                };
                cloudWebSocket.sendMessage(JSON.stringify(msg));
            } else {
                console.log('Websocket to cloud not connected, can\'t persist model.');
            }
        }, 100);
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
     * @param action: action taken (one of EasyReadingReasoner.A)
     * @param feedback: User mood as selected by the user (confused/relaxed)
     * @returns {number}: A numeric reward signal, the higher the better. Especially rewards detecting confusion.
     */
    humanFeedbackToReward(action, feedback) {
        let reward = 0.0;
        if (action) {
            if (feedback === EasyReadingReasoner.user_S.confused) {
                if (action === EasyReadingReasoner.A.showHelp) {
                    reward = 10;
                } else if (action === EasyReadingReasoner.A.nop) {
                    reward = -200.0;
                } else {
                    reward = -10.0;
                }
            } else if (feedback === EasyReadingReasoner.user_S.relaxed) {
                if (action === EasyReadingReasoner.A.showHelp) {
                    reward = -20.0;
                } else if (action === EasyReadingReasoner.A.nop) {
                    reward = 0.0;
                } else {
                    reward = -10.0;
                }
            }
        }
        return reward;
    }

    isIgnoredUrl(url) {
        let ignore = false;
        let systemURL = easyReading.cloudEndpoints[easyReading.config.cloudEndpointIndex].url;
        if (url && systemURL) {
            if (url.toLowerCase().includes(systemURL)) {
                ignore = true;
            }
        }
        return ignore;
    }

    /**
     * Return a random action regardless of state; Asking user feedback has highest priority
     * @returns {string}
     */
    static randomAction() {
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


}

class QLearningReasoner extends EasyReadingReasoner {

    ucb = 0; // Upper-Confidence-Bound Action Selection constant
    q_func = null;  // Action value function: (n_states x n_features) tensor

    constructor(step_size=0.01, x_offset = 0, y_offset = 0, gamma=0.1, eps=0.1, eps_decay=1, ucb=0.0) {
        super(step_size, x_offset, y_offset, gamma, eps, eps_decay);
        this.model_type = 'q_learning';
        this.ucb = ucb;
        this.initQFunction();
        this.resetStatus();
    }

    load(id, pid, hyperparams, params=null) {
        super.load(id, pid, hyperparams);
        this.model_type = 'q_learning';
        if (!this.q_func) {
            this.initQFunction();
        }
        // Copy reasoner state, if given
        if (params !== null) {
            this.loadParams(params);
        }
    }

    loadParams(params) {
        super.loadParams(params);
        if ('q_func' in params) {
            this.q_func.load(params.q_func);
        }
        if ('ucb' in params) {
            this.ucb = params.ucb;
            this.q_func.ucb = params.ucb;
        }
    }

    async to_dict(include_params=true) {
        let this_dict = await super.to_dict(include_params);
        if (include_params) {
            this_dict['params'] = {
                'ucb': this.ucb,
                'q_func': this.q_func,
            };
        }
        return this_dict;
    }

    initQFunction() {
        this.q_func = new ActionValueFunction(Object.values(EasyReadingReasoner.A),
            [EasyReadingReasoner.A.askUser, EasyReadingReasoner.A.nop],  // Preferred actions in ties
            [EasyReadingReasoner.A.ignore],  // Never return this action, used for faulty messages
            this.ucb);
        console.log('Q function initialized');
    }

    bestAction() {
        return this.q_func.epsGreedyAction(this.s_curr, this.eps, this.t_current, !this.is_paused);
    }

    updateStep(action, reward) {
        if (this.q_func) {
            console.log('Updating Q state-action value function');
            let q_target = reward + this.gamma * this.q_func.retrieveGreedy(this.s_next, this.t_current);
            let new_q_value = this.alpha * (q_target - this.q_func.retrieve(this.s_curr, action));
            this.q_func.update(this.s_curr, action, new_q_value);
        }
    }

}

class DoubleQLearningReasoner extends QLearningReasoner {

    q_func_b = null;  // Action value function B for double Q-learning: (n_states x n_features) tensor

    constructor(step_size=0.01, x_offset = 0, y_offset = 0, gamma=0.1, eps=0.1, eps_decay=1, ucb=0.0) {
        super(step_size, x_offset, y_offset, gamma, eps, eps_decay, ucb);
        this.model_type = 'double_q_learning';
        this.initDoubleQFunction();
    }

    initDoubleQFunction() {
        this.q_func_b = new ActionValueFunction(Object.values(EasyReadingReasoner.A),
            [EasyReadingReasoner.A.askUser, EasyReadingReasoner.A.nop],
            [EasyReadingReasoner.A.ignore],
            this.ucb);
        console.log('Double Q function initialized');
    }

    load(id, pid, hyperparams, params) {
        super.load(id, pid, hyperparams, params);
        this.model_type = 'double_q_learning';
        if (!this.q_func_b || !this.q_func) {
            this.initDoubleQFunction();
        }
        this.loadParams(params);
    }

    loadParams(params) {
        super.loadParams(params);
        if ('q_func_b' in params) {
            this.q_func_b.q = params.q_func_b;
        }
    }

    async to_dict(include_params=true) {
        let this_dict = await super.to_dict(include_params);
        if (include_params) {
            this_dict['params']['q_func_b'] = this.q_func_b;
        }
        return this_dict;
    }

    bestAction() {
        return this.q_func.epsGreedyCombinedAction(this.s_curr, this.eps, this.q_func_b, this.t_current, !this.is_paused);
    }

    updateStep(action, reward) {
        if (this.q_func && this.q_func_b) {
            console.log('Updating Double-Q state-action value function');
            let to_update = 'a';
            if (Math.random() < 0.5) {
                to_update = 'b';
            }
            let q_target = 0.0;
            let new_q_value = 0.0;
            if (to_update === 'a') {
                q_target = reward +
                    this.gamma * this.q_func_b.retrieve(this.s_next,
                        this.q_func.greedyAction(this.s_next, this.t_current, false));
                new_q_value = this.alpha * (q_target - this.q_func.retrieve(this.s_curr, action));
                this.q_func.update(this.s_curr, action, new_q_value);
            } else {
                q_target = reward +
                    this.gamma * this.q_func.retrieve(this.s_next,
                        this.q_func_b.greedyAction(this.s_next, this.t_current, false));
                new_q_value = this.alpha * (q_target - this.q_func_b.retrieve(this.s_curr, action));
                this.q_func_b.update(this.s_curr, action, new_q_value);
            }
        }
    }

}

class ANNReasoner extends EasyReadingReasoner {

    constructor(step_size=0.01, x_offset = 0, y_offset = 0, gamma=0.1, eps=0.1, eps_decay=1) {
        super(step_size, x_offset, y_offset, gamma, eps, eps_decay);
        this.model_type = 'rnn';
    }

    load(id, pid, hyperparams, params) {
        if ('n_features' in params) {
            super.load(id, pid, hyperparams);
            this.model = tf.sequential();
            this.model.add(tf.layers.dense({units: 32, activation: 'tanh', inputShape: [params.n_features]}));
            this.model.add(tf.layers.dense({units: 32, activation: 'tanh', inputShape: [params.n_features]}));
            this.model.add(tf.layers.dense({units: 1, activation: 'sigmoid'}));
            this.model.compile({optimizer: 'sgd', loss: 'meanSquaredError'});
            console.log('Model Loaded: ' + this.model);
        } else {
            console.log('ANNReasoner could not be loaded: missing number of input features');
        }
    }

    bestAction() {
        return this.model.predict(this.s_curr);
    }

    async to_dict(include_params=true) {
        return await this.model.save(tf.io.withSaveHandler(async modelArtifacts => modelArtifacts));
    }

}
