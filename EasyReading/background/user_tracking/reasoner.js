/**
 * Reasoner base class
 * @Class EasyReadingReasoner
 */
class EasyReadingReasoner {

    /**
     * Create a base reasoner.
     * @param {number} step_size - Step size in model update rule, between 0 and 1, commonly known as alpha
     * @param {number} x_offset - Offset from the screen's origin, in pixels, of the x coordinate
     * of the browser's window
     * @param {number} y_offset - Offset from the screen's origin, in pixels, of the y coordinate
     * of the browser's window
     * @param {number} gamma - Discount factor used in return computation
     * @param {number} eps - Epsilon probability for e-greedy policies
     * @param {number} eps_decay - Epsilon decay factor (applied on each time step)
     */
    constructor (step_size=0.01, x_offset = 0, y_offset = 0, gamma=1., eps=0.1, eps_decay=1) {
        // Model hyper-parameters
        this.model_type = 'none';
        this.model = null;
        this.alpha = step_size;
        this.gamma = gamma;
        this.eps = eps;
        this.eps_decay = eps_decay;
        this.t_current = 1;
        this.gaze_offsets = [x_offset, y_offset];
        this.episode_length = 20;  // Time steps before ending episode

        // Internal parameters
        this.id = -1;
        this.pid = -1;  // User profile ID
        this.is_active = true;  // Reasoner is disabled when tracking data not available e.g. AsTeRICS model not running
        this.is_paused = false;  // Reasoner is paused while cloud processes a request
        this.user_status = EasyReadingReasoner.user_S.relaxed;  // Estimation of user's current status
        this.reward = null;  // Reward obtained in current timestep
        this.s_curr = null;  // Current state (tensor)
        this.s_next = null;  // Next state (tensor)
        this.last_action = null;  // Last action taken
        this.user_action = null;  // Action actually taken by user
        this.t_current = 1;  // Current timestep
        this.waiting_start = null;
        this.waiting_feedback = false;  // Whether reasoner is waiting for user feedback (feedback may be implicit)
        this.collect_t = "before";  // Whether status being received refers to before or after feedback obtained
        this.feature_names = [];
        this.cancel_unfreeze = false;
        this.freeze_start = null;

        // Tracking parameters
        this.IDLE_TIME = 30000;  // User idle time (ms) before inferring user reward
        this.NEXT_STATE_TIME = 10000;  // Time to wait when collecting next state
        this.UNFREEZE_TIME = 300000;  // Time to automatically unfreeze paused reasoner (5 minutes)
        this.BUFFER_BEFORE_SIZE = 5;
        this.BUFFER_AFTER_SIZE = 5;
        this.s_buffer = [];  // Buffer of states before feedback
        this.s_next_buffer = [];  // Buffer of states after feedback
        this.gaze_info = [];  // User's gaze coordinates (relative to the viewport) of state being reasoned
        this.gaze_offsets = [];  // User's gaze offsets for x and y coordinates from screen origin to viewport origin

        // Timeouts
        this.unfreezeTimeout = null;
        this.serializeTimeout = null;
        this.waitUserReactionTimeout = null;
        this.waitForFeedbackTimeout = null;
        this.collectNextStateTimeout = null;
    }

    /**
     * Active set object. A disabled reasoner ignores any incoming tracking data. Moreover, its state gets reset.
     * Once the reasoner is enabled again, it will start collecting data from an empty state. Long-term memory i.e.
     * model parameters are always kept.
     * @param {boolean} active: whether to activate/enable or deactivate/disable the current reasoner
     */
    set active(active) {
        this.is_active = active;
        if (active) {
            console.log("Reasoner enabled");
        } else {
            console.log("Reasoner disabled");
            this.resetStatus();
        }
    }

    /**
     * Active get object. A disabled reasoner ignores any incoming tracking data
     * @returns {boolean}: whether the current reasoner is active (True) or disabled (False)
     */
    get active() {
        return this.is_active;
    }

    /**
     * Actions get object: return the environment actions in an object
     * @returns {{nop: string, askUser: string, showHelp: string, ignore: string}}
     */
    static get A() {
        return {'nop': 'nop', 'askUser': 'askuser', 'showHelp': 'showhelp', 'ignore': 'ignore'};
    }

    /**
     * States get object: return the set of user states in an object
     * @returns {{relaxed: string, confused: string, unsure: string}}
     */
    static get user_S() {
        return {'relaxed': 'relaxed', 'confused': 'confused', 'unsure': 'unsure'};
    }

    /**
     * Populate this reasoner from objects
     * @param {number} id: reasoner unique id
     * @param {number} pid: user profile id
     * @param {Object.} hyperparams: key-value pairs to initialize this reasoner's attributes.
     * @param {Object.} params: trained model parameters e.g. weights or tabular values
     */
    load(id, pid, hyperparams, params=null) {
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

    /**
     * Populate this reasoner's parameters from an object
     * @param {Object.} params: key-value pairs to initialize this reasoner's parameters.
     */
    loadParams(params) {
        if ('model' in params) {
            this.model = params.model;
        }
    }

    /**
     * Convert this reasoner to an object
     * @param {boolean} include_params: whether to include this model's parameters (True) or only its uninitialized
     * topology (False)
     * @returns {Object.}: serialized reasoner instance as key-value pairs
     */
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

    /**
     * Serialize this reasoner to JSON
     * @returns {Promise<string>}: JSON-serialized reasoner instance
     */
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

    /**
     * Clear all timeouts of this instance
     */
    clearTimeouts() {
        clearTimeout(this.unfreezeTimeout);
        clearTimeout(this.serializeTimeout);
        clearTimeout(this.waitUserReactionTimeout);
        clearTimeout(this.waitForFeedbackTimeout);
        clearTimeout(this.collectNextStateTimeout);
    }

    /**
     * Take an step given the current state and model
     * @param {Object.} message An object (a single observation from tracking data) with feature labels as keys and
     * feature vectors as values
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

        let action = null;

        // Process input batch
        const sample_generator = splitBatch(message);
        while (true) {
            let s = sample_generator.next();
            if (s.done) {
                break;
            }
            this.feature_names = s.value.labels;  // Precondition: all messages carry same labels
            let features = s.value.features;
            // Push sample to corresponding buffer
            if (this.collect_t === 'before') {
                console.log('Push before');
                console.log(s.value.labels);
                console.log(features);
                let n = this.s_buffer.push(features);
                if (n > this.BUFFER_BEFORE_SIZE) {
                    this.s_buffer.shift();
                }
            } else {
                console.log('Push after');
                console.log(s.value.labels);
                console.log(features);
                let n = this.s_next_buffer.push(features);
                if (n > this.BUFFER_AFTER_SIZE) {
                    this.s_next_buffer.shift();
                }
            }
        }

        // Take action according to samples
        if (this.feature_names.length > 0 && this.collect_t === 'before' && !this.waiting_feedback) {
            let state = preProcessSample(this.feature_names, this.aggregateStates(this.s_buffer));
            if (state) {
                this.updateGazeInfo(this.feature_names);  // Save gaze position of current state
                action = this.predict(state);
            }
        } // Otherwise take no action, we are collecting next state

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

    /**
     * Return the best action for the current state given the model's current reasoning
     * @returns {string} an action from set A
     */
    bestAction() {
        return EasyReadingReasoner.randomAction();  // Base agent has no knowledge, return random A
    }

    /**
     * Observe next state after having taken an action and wait until user performs and action or timeout
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

    /**
     * Infer user feedback from the user's action or from last taken reasoner's action if user did not respond
     */
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
     * @param {string} feedback: "help" or "ok" (help not needed)
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

    /**
     * Perform an update step given an action and its reward given the current state
     * @param {string} action: last taken action
     * @param {string} reward: last reward obtained after having taken action
     */
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

    /**
     * Freeze current reasoner. A frozen reasoner ignores any incoming tracking data, but its status is kept. If the
     * reasoner stays frozen for too long, it unfreezes automatically after UNFREEZE_TIME milliseconds.
     */
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

    /**
     * Unfreeze reasoner. Resume data collection.
     * @param {boolean} log: whether to print to console that the reasoner has been unfrozen.
     */
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

    /**
     * Compute user gaze coordinates from incoming tracking data.
     * @param {Array.} labels: ordered list of feature labels. Must contain 'gazeX' and 'gazeY' labels appearing in
     * the same position as their corresponding values appear on each sample of this.s_buffer.
     */
    updateGazeInfo(labels) {
        this.gaze_info = get_gaze(labels, this.s_buffer, this.gaze_offsets[0], this.gaze_offsets[1]);
    }

    /**
     * Callback after an episode has ended
     * @param {boolean} saveToCloud: whether to persist the current state of the reasoner to the user's profile in
     * the cloud.
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
     * @param {string} what: what to serialize: only the model and its hyperparameters ('model'), only the current
     * model's parameters ('params'), or everything ('all')
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
     * @param {Array} buffer: array of past states; shape (timesteps x n_features)
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
     * @param {string} action: action taken (one of EasyReadingReasoner.A)
     * @param {string} feedback: User mood as selected by the user (confused/relaxed)
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

    /**
     * Return whether the reasoner must ignore user interaction with a certain web site
     * @param {string} url: HTTP URL to consider
     * @returns {boolean}: True if user tracking must be ignored for the given URL e.g. a system page; False otherwise
     */
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
     * @returns {string}: An action; one of EasyReadingReasoner.A
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

/**
 * A tabular Q-Learning reasoner.
 */
class QLearningReasoner extends EasyReadingReasoner {

    /**
     * Create a QLearningReasoner.
     * @param {number} step_size - Step size in model update rule, between 0 and 1, commonly known as alpha
     * @param {number} x_offset - Offset from the screen's origin, in pixels, of the x coordinate
     * of the browser's window
     * @param {number} y_offset - Offset from the screen's origin, in pixels, of the y coordinate
     * of the browser's window
     * @param {number} gamma - Discount factor used in return computation
     * @param {number} eps - Epsilon probability for e-greedy policies
     * @param {number} eps_decay - Epsilon decay factor (applied on each time step)
     * @param {number} ucb - Upper-Confidence-Bound Action Selection constant. Should be kept to zero in most cases.
     */
    constructor(step_size=0.01, x_offset = 0, y_offset = 0, gamma=0.1, eps=0.1, eps_decay=1, ucb=0.0) {
        super(step_size, x_offset, y_offset, gamma, eps, eps_decay);
        this.q_func = null;  // Action value function: (n_states x n_features) tensor
        this.model_type = 'q_learning';
        this.ucb = ucb;
        this.initQFunction();
        this.resetStatus();
    }

    /**
     * Populate this reasoner from objects
     * @param {number} id: reasoner unique id
     * @param {number} pid: user profile id
     * @param {Object.} hyperparams: key-value pairs to initialize this reasoner's attributes.
     * @param {Object.} params: trained model parameters i.e. tabular Q-function values
     */
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

    /**
     * Populate this reasoner's model parameters
     * @param {Object.} params: trained model parameters i.e. tabular Q-function values
     */
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

    /**
     * Convert this reasoner to an object
     * @param {boolean} include_params: whether to include this model's parameters (True) or only its uninitialized
     * topology (False)
     * @returns {Object.}: serialized reasoner instance as key-value pairs. It adds 'ucb' and 'q_func' fields to
     * the base reasoner object
     */
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

    /**
     * Initialize this model's Q-Function from scratch i.e. lazily set all action-values to zero.
     */
    initQFunction() {
        this.q_func = new ActionValueFunction(Object.values(EasyReadingReasoner.A),
            [EasyReadingReasoner.A.askUser, EasyReadingReasoner.A.nop],  // Preferred actions in ties
            [EasyReadingReasoner.A.ignore],  // Never return this action, used for faulty messages
            this.ucb);
        console.log('Q function initialized');
    }

    /**
     * Return the best action for the current state given the model's current reasoning i.e. the action with the highest
     * q-value for the current state.
     * @returns {string} an action from set A
     */
    bestAction() {
        return this.q_func.epsGreedyAction(this.s_curr, this.eps, this.t_current, !this.is_paused);
    }

    /**
     * Perform an update step given an action and its reward given the current state
     * @param {string} action: last taken action
     * @param {string} reward: last reward obtained after having taken action
     */
    updateStep(action, reward) {
        if (this.q_func) {
            console.log('Updating Q state-action value function');
            let q_target = reward + this.gamma * this.q_func.retrieveGreedy(this.s_next, this.t_current);
            let new_q_value = this.alpha * (q_target - this.q_func.retrieve(this.s_curr, action));
            this.q_func.update(this.s_curr, action, new_q_value);
        }
    }

}

/**
 * A tabular double q-learning reasoner
 */
class DoubleQLearningReasoner extends QLearningReasoner {

    /**
     * Create a DoubleQLearningReasoner.
     * @param {number} step_size - Step size in model update rule, between 0 and 1, commonly known as alpha
     * @param {number} x_offset - Offset from the screen's origin, in pixels, of the x coordinate
     * of the browser's window
     * @param {number} y_offset - Offset from the screen's origin, in pixels, of the y coordinate
     * of the browser's window
     * @param {number} gamma - Discount factor used in return computation
     * @param {number} eps - Epsilon probability for e-greedy policies
     * @param {number} eps_decay - Epsilon decay factor (applied on each time step)
     * @param {number} ucb - Upper-Confidence-Bound Action Selection constant. Should be kept to zero in most cases.
     */
    constructor(step_size=0.01, x_offset = 0, y_offset = 0, gamma=0.1, eps=0.1, eps_decay=1, ucb=0.0) {
        super(step_size, x_offset, y_offset, gamma, eps, eps_decay, ucb);
        this.q_func_b = null;  // Action value function B for double Q-learning: (n_states x n_features) tensor
        this.model_type = 'double_q_learning';
        this.initDoubleQFunction();
    }

    /**
     * Initialize this model's Q-Functions from scratch i.e. lazily set all action-values to zero.
     */
    initDoubleQFunction() {
        this.q_func_b = new ActionValueFunction(Object.values(EasyReadingReasoner.A),
            [EasyReadingReasoner.A.askUser, EasyReadingReasoner.A.nop],
            [EasyReadingReasoner.A.ignore],
            this.ucb);
        console.log('Double Q function initialized');
    }

    /**
     * Populate this reasoner from objects
     * @param {number} id: reasoner unique id
     * @param {number} pid: user profile id
     * @param {Object.} hyperparams: key-value pairs to initialize this reasoner's attributes.
     * @param {Object.} params: trained model parameters i.e. tabular Q-function values
     */
    load(id, pid, hyperparams, params) {
        super.load(id, pid, hyperparams, params);
        this.model_type = 'double_q_learning';
        if (!this.q_func_b || !this.q_func) {
            this.initDoubleQFunction();
        }
        this.loadParams(params);
    }

    /**
     * Populate this reasoner's model parameters
     * @param {Object.} params: trained model parameters i.e. tabular Q-function values
     */
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

    /**
     * Return the best action for the current state given the model's current reasoning i.e. the action with the highest
     * sum of q-values for the current state.
     * @returns {string} an action from set A
     */
    bestAction() {
        return this.q_func.epsGreedyCombinedAction(this.s_curr, this.eps, this.q_func_b, this.t_current, !this.is_paused);
    }

    /**
     * Perform an update step given an action and its reward given the current state
     * @param {string} action: last taken action
     * @param {string} reward: last reward obtained after having taken action
     */
    updateStep(action, reward) {
        if (this.q_func && this.q_func_b) {
            console.log('Updating Double-Q state-action value function');
            let to_update = 'a';
            if (Math.random() < 0.5) {  // Update second q-value function with 50% probability
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

/**
 * An artificial neural network (ANN) reasoner
 */
class ANNReasoner extends EasyReadingReasoner {

    constructor(step_size=0.01, x_offset = 0, y_offset = 0, gamma=0.1, eps=0.1, eps_decay=1) {
        super(step_size, x_offset, y_offset, gamma, eps, eps_decay);
        this.model_type = 'rnn';
    }

    /**
     * Populate this reasoner from objects
     * @param {number} id: reasoner unique id
     * @param {number} pid: user profile id
     * @param {Object.} hyperparams: key-value pairs to initialize this reasoner's attributes.
     * @param {Object.} params: trained model parameters i.e. network weights
     */
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

    /**
     * Return the best action for the current state given the model's current reasoning
     * @returns {string} an action from set A
     */
    bestAction() {
        return this.model.predict(this.s_curr);
    }

    /**
     * Convert this reasoner to an object
     * @param {boolean} include_params: whether to include this model's parameters (True) or only its uninitialized
     * topology (False)
     * @returns {Object.}: serialized reasoner instance as key-value pairs
     */
    async to_dict(include_params=true) {
        return await this.model.save(tf.io.withSaveHandler(async modelArtifacts => modelArtifacts));
    }

}
