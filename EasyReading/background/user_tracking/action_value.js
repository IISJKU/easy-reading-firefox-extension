/**
 * Tabular action-value function (a.k.a. Q-function)
 */
class ActionValueFunction {
    /**
     * ActionValueFunction constructor
     * @param {string[]} actions: agent actions
     * @param {string[]} preferred_a: sorted list of actions. Lower indexed actions have higher preference in ties.
     * @param {string[]} ignore_a: list of actions that will never be output.
     * @param {number} ucb_c: UCB degree of exploration
     */
    constructor(actions, preferred_a=[], ignore_a=[], ucb_c=0.0) {
        this.q = {};
        this.actions = [];
        this.n_actions = 0;
        this.preferred_actions = [];
        this.count_actions = {};  // Counter of actions taken
        this.ucb_c = 0.0;
        if (actions && actions.length > 0) {
            for (let i=0; i<actions.length; i++) {
                if (ignore_a.indexOf(actions[i]) < 0) {
                    this.actions.push(actions[i]);
                    this.count_actions[actions[i]] = 0;
                }
            }
            this.n_actions = this.actions.length;
            this.preferred_actions = preferred_a;
            this.ucb_c = ucb_c;
        }
    }

    /**
     * Retrieve the value of a (state, action) pair
     * @param {(string|number)} state: State to consider
     * @param {(string|number)} action: Action to consider
     * @returns {number} Currently estimated return of taking the given action on the given state
     */
    retrieve(state, action) {
        let state_data = background_util.getStateRepresentation(state);
        if (state_data in this.q && action in this.q[state_data]) {
            return this.q[state_data][action];
        } else {
            return 0.0;
        }
    }

    /**
     * Retrieve the maximum value for the given state
     * @param {(string|number)} state: State to consider
     * @param {number} t: current time step
     * @returns {number} Currently estimated return on the given state when taking the estimated best possible action
     */
    retrieveGreedy(state, t) {
        let action = this.greedyAction(state, t, false);
        return this.retrieve(state, action);
    }

    /**
     * Greedy double Q-learning: Given S, return A <- argmax_a(Q(S,a) + Q_B(S,a))
     * @param {(string|number)} state; State for which to return best action
     * @param {ActionValueFunction} q_b; ActionValueFunction instance for second action-value function
     * @param {number} t: Agent's current time step
     * @param {boolean} increase_counter: whether the action counter needs to be increased
     * @returns {(string|number)} Action yielding the best expected future return starting from S
     */
    greedyCombinedAction(state, q_b, t, increase_counter) {
        let chosen_a = null;
        if (state) {
            let state_data = background_util.getStateRepresentation(state);
            if (state_data in this.q) {
                let tied_actions = [];
                let v = Number.NEGATIVE_INFINITY;
                for (let a = 0; a < this.actions.length; a++) {
                    let action = this.actions[a];
                    let g = this.retrieve(state_data, action);
                    if (q_b) {
                        g += q_b.retrieve(state_data, action);
                    }
                    if (this.ucb_c > 0) {
                        g += this.upper_confidence_bound(action, t);
                    }
                    if (g > v) {
                        v = g;
                        tied_actions = [action];
                    } else if (g === Number.POSITIVE_INFINITY || Math.abs(g - v) < 0.0001) {
                        tied_actions.push(action);
                    }
                }
                if (tied_actions.length === 1) {
                    chosen_a = tied_actions[0];
                } else if (tied_actions.length > 1) {
                    for (let i = 0; i < this.preferred_actions.length; i++) {
                        let p_a = this.preferred_actions[i];
                        if (tied_actions.indexOf(p_a) > -1) {
                            chosen_a = p_a;
                            break;
                        }
                    }
                    if (chosen_a === null) {
                        // Random tie break
                        chosen_a = tied_actions[Math.floor(Math.random() * tied_actions.length)];
                    }
                }
            }
        }
        if (chosen_a === null) {
            chosen_a = this.getRandomAction(increase_counter);
        }
        if (increase_counter) {
            this.count_actions[chosen_a]++;
        }
        return chosen_a;
    }

    /**
     * Greedy Q-learning: Given S, return A <- argmax_a(Q(S,a))
     * @param {(string|number)} state; State for which to return best action
     * @param {number} t: Agent's current time step
     * @param {boolean} increase_counter: whether the action counter needs to be increased
     * @returns {(string|number)} Action yielding the best expected future return starting from S
     */
    greedyAction(state, t, increase_counter) {
        return this.greedyCombinedAction(state, null, t, increase_counter);
    }

    /**
     * Given S, return A <- argmax_a(Q(S,a)), with eps probability of instead choosing an action randomly
     * @param {(string|number)} state; State for which to return best action
     * @param {number} eps: Probability of exploring a random action instead of acting greedily
     * @param {number} t: Agent's current time step
     * @param {boolean} increase_counter: whether the action counter needs to be increased
     * @returns {(string|number)} Action yielding the best expected future return starting from S (or random action)
     */
    epsGreedyAction(state, eps, t, increase_counter) {
        return this.epsGreedyCombinedAction(state, eps, null, t, increase_counter);
    }

    /**
     * Given S, return A <- argmax_a(Q(S,a) + Q_B(S,a)), with eps probability of instead choosing an action randomly
     * (double Q-learning)
     * @param {(string|number)} state; State for which to return best action
     * @param {number} eps: Probability of exploring a random action instead of acting greedily
     * @param {ActionValueFunction} q_b: ActionValueFunction instance for second action-value function
     * @param {number} t: Agent's current time step
     * @param {boolean} increase_counter: whether the action counter needs to be increased
     * @returns {(string|number)} Action yielding the best expected future return starting from S (or random action)
     */
    epsGreedyCombinedAction(state, eps, q_b, t, increase_counter) {
        if (eps > 0.01 && Math.random() <= eps) {
            return this.getRandomAction(increase_counter);
        }
        return this.greedyCombinedAction(state, q_b, t, increase_counter);
    }

    /**
     * Update rule: Q(s,a) <- Q(s,a) + value. Default value is zero.
     * @param {(string|number)} state; State to update
     * @param {(string|number)} action; action to update
     * @param {number} value: current estimation of (state, action) pair's return
     * @param {boolean} update: True to update Q with new value, False to override old value with new one.
     */
    insert(state, action, value, update=false) {
        if (state) {
            let state_data = background_util.getStateRepresentation(state);
            if (state_data in this.q) {
                if (action in this.q[state_data]) {
                    if (update) {
                        this.q[state_data][action] += value;
                    } else {
                        this.q[state_data][action] = value;
                    }
                } else {
                    this.q[state_data][action] = value;
                }
            } else {
                this.q[state_data] = {};
                this.q[state_data][action] = value;
            }
        }
    }

    /**
     * Update rule: Q(s,a) <- Q(s,a) + value. Old value gets overridden by new one.
     * @param {(string|number)} state; State to update
     * @param {(string|number)} action; action to update
     * @param {number} value: current estimation of (state, action) pair's return
     */
    update(state, action, value) {
        this.insert(state, action, value, true);
    }

    /**
     * Returns the current UCB value for the given action
     * @param {(string|number)} action; action to consider
     * @param {number} t: current time step
     * @returns {number} Computed UCB value
     */
    upper_confidence_bound(action, t) {
        if (action && t > 0 && action in this.count_actions) {
            if (this.count_actions[action] > 0) {
                return this.ucb_c * Math.sqrt(Math.log(t)/this.count_actions[action]);
            } else {
                return Number.POSITIVE_INFINITY;
            }
        }
        return 0.0;
    }

    /**
     * Return a random action from the action state
     * @param {boolean} increase_counter: Whether to increase the action counter for the selected action
     * @returns {(string|number)} the selected action
     */
    getRandomAction(increase_counter) {
        let a = null;
        if (this.preferred_actions.length) {
            a = this.preferred_actions[0];
        } else {
            a =  this.actions[this.getRandomActionIndex()];
        }
        if (increase_counter) {
            this.count_actions[a]++;
        }
        return a;
    }

    /**
     * Serialize this action-value function to JSON
     * @returns {string} JSON serialized object
     */
    serialize() {
        return JSON.stringify({
            'q' : this.q,
            'actions': this.actions,
            'preferred_actions': this.preferred_actions,
            'count_actions': this.count_actions,
            'ucb_c': this.ucb_c,
        });
    }

    /**
     * Load the contents of a serialized action-value function
     * @param {Object.} serialized_q: an object from a just parsed JSON-serialized action-value function
     */
    load(serialized_q) {
        if (serialized_q && !background_util.isEmptyObject(serialized_q)) {
            if ('q' in serialized_q) {
                if (background_util.isObject(serialized_q.q)) {
                    this.q = serialized_q.q;
                } else if (typeof serialized_q.q === "string") {
                    this.q = JSON.parse(serialized_q.q);
                } else {
                    console.log("Unknown q function given to Action-Value function");
                }
            }
            if ('actions' in serialized_q) {
                if (typeof serialized_q.actions === "string") {
                    this.actions = JSON.parse(serialized_q.actions);
                } else if (Array.isArray(serialized_q.actions)){
                    this.actions = serialized_q.actions;
                } else {
                    console.log("Unknown actions given to Action-Value function");
                }
            }
            this.n_actions = this.n_actions.length;
            if ('preferred_actions' in serialized_q) {
                if (typeof serialized_q.preferred_actions === "string") {
                    this.preferred_actions = JSON.parse(serialized_q.preferred_actions);
                } else if (Array.isArray(serialized_q.preferred_actions)){
                    this.preferred_actions = serialized_q.preferred_actions;
                } else {
                    console.log("Unknown preferred actions given to Action-Value function");
                }
            }
            if ('count_actions' in serialized_q) {
                if (background_util.isObject(serialized_q.count_actions)) {
                    this.count_actions = serialized_q.count_actions;
                } else if (typeof serialized_q.count_actions === "string") {
                    this.count_actions = JSON.parse(serialized_q.count_actions);
                } else {
                    console.log("Unknown action counts given to Action-Value function");
                }
            }
            if ('ucb_c' in serialized_q) {
                this.ucb_c = Number(serialized_q.ucb_c);
            }
        } else {
            this.q = {};
        }
    }

    /**
     * Get the index in action space of a random action
     * @returns {number}: a random index within the action space
     */
    getRandomActionIndex() {
        return Math.floor(Math.random() * this.n_actions);
    }

    /**
     * Return the index of the maximum value of the given array
     * @param {number[]} array: array of numerical values
     * @returns {number}: index of the maximum value of array
     */
    static argMax(array) {
        return array.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
    }

}
