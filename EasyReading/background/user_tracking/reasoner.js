class EasyReadingReasoner {

    active = true;
    actions = {'nop': 0, 'askUser': 1, 'showHelp': 2};
    user_states = {'relaxed': 0, 'confused': 1, 'unsure': 2};
    model = null;

    last_action = this.actions.nop;
    user_status = this.user_states.relaxed;

    constructor (n_features=3) {
        this.loadModel(n_features);
    }

    loadModel(n_features) {
        this.w = tf.zeros([1, n_features], 'float32');
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

    /*
    Take a step and return state
     */
    step (message) {

        return "askUserNeedsHelp";
    };

    /**
     * Compare human-given feedback with current estimation of user mood and return a corresponding numeric reward
     * @param feedback: User mood as selected by the user (confused/relaxed)
     * @returns {number}: A numeric reward signal, the higher the better. Especially rewards detecting confusion.
     */
    humanFeedbackToReward(feedback) {
        let reward = 0.0;
        if (feedback === this.user_states.confused) {
            if (this.user_status === this.user_states.confused) {
                reward = 100.0;
            } else if (this.user_status === this.user_states.relaxed) {
                reward = -100.0;
            } else {
                reward = -10.0;
            }
        } else if (feedback === this.user_states.relaxed) {
            if (this.user_status === this.user_states.confused) {
                reward = -10.0;
            } else if (this.user_status === this.user_states.relaxed) {
                reward = 0.001;
            } else {
                reward = -10.0;
            }
        }
        return reward;
    }
}
