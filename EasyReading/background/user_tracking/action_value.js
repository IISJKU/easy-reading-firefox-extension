class ActionValueFunction {
    q = {};
    actions = [];
    n_actions = 0;

    constructor(actions) {
        if (actions && actions.length > 0) {
            this.actions = actions;
            this.n_actions = actions.length;
        }
    }

    retrieve(state, action) {
        let state_data = this.getStateRepresentation(state);
        if (state_data in this.q && action in this.q[state_data]) {
            return this.q[state_data][action];
        } else {
            return 0.0;
        }
    }

    retrieveGreedy(state) {
        let action = this.greedyAction(state);
        return this.retrieve(state, action);
    }

    /**
     * Given S, return A <- argmax_a(Q(S,a))
     * @param state; State S for which to return best action
     * @returns string; Action yielding the best expected future return starting from S
     */
    greedyAction(state) {
        return this.epsGreedyAction(state, 0.0)
    }

    /**
     * Given S, return A <- argmax_a(Q(S,a)), with eps probability of instead choosing an action randomly
     * @param state; State for which to return best action
     * @param eps; Probability of exploring a random action instead of acting greedily
     * @returns string; Action yielding the best expected future return starting from S (or random action)
     */
    epsGreedyAction(state, eps) {
        return this.epsGreedyCombinedAction(state, eps, null);
    }

    /**
     * Given S, return A <- argmax_a(Q_A(S,a) + Q_B(S,a)), with eps probability of instead choosing an action randomly
     * (double Q-learning)
     * @param state; State for which to return best action
     * @param eps; Probability of exploring a random action instead of acting greedily
     * @param q_b; ActionValueFunction instance for second action-value function (Q_B)
     * @returns string; Action yielding the best expected future return starting from S (or random action)
     */
    epsGreedyCombinedAction(state, eps, q_b) {
        if (state) {
            let state_data = this.getStateRepresentation(state);
            if (state_data in this.q) {
                if (eps > 0.01 && Math.random() <= eps) {
                    return this.getRandomAction();
                }
                let tied_actions = [];
                let v = Number.NEGATIVE_INFINITY;
                for (let a in this.actions) {
                    let action = this.actions[a];
                    let g = this.retrieve(state_data, action);
                    if (q_b) {
                        g += q_b.retrieve(state_data, action);
                    }
                    if (g > v) {
                        v = g;
                        tied_actions = [action];
                    } else if (Math.abs(g - v) < 0.0001) {
                        tied_actions.push(action);
                    }
                }
                return tied_actions[Math.floor(Math.random() * tied_actions.length)];  // Random tie break
            }
        }
        return this.getRandomAction();
    }

    /**
     * Update rule: Q(s,a) <- Q(s,a) + value. Default value is zero.
     * @param state
     * @param action
     * @param value
     * @param update: True to update Q with new value, False to override old value with new one.
     */
    insert(state, action, value, update=false) {
        if (state) {
            let state_data = this.getStateRepresentation(state);
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

    update(state, action, value) {
        this.insert(state, action, value, true);
    }

    static argMax(array) {
        return array.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
    }

    getRandomAction() {
        return this.actions[this.getRandomActionIndex()];
    }

    getRandomActionIndex() {
        return Math.floor(Math.random() * this.n_actions);
    }

    getStateRepresentation(state) {
        let state_data = null;
        if (isTensor(state)) {
            state_data = state.dataSync();
        } else {
            state_data = state;
        }
        return state_data;
    }

}
