/**
 * Create reasoner of a specific subclass
 */
class EasyReadingReasonerFactory {

    /**
     * Create a new EasyReadingReasoner instance from the serialized data
     * @param {Object.} model_dict: and object containing the reasoner's data
     * @param {boolean} active: whether to enable the loaded reasoner
     * @returns {EasyReadingReasoner} a reasoner instance of the given subclass
     */
    static loadReasoner(model_dict, active=false) {
        let reasoner = null;
        let hyperparams = {};
        let params = {};
        if ('model_type' in model_dict) {
            if ('hyperparams' in model_dict) {
                if (background_util.isObject(model_dict.hyperparams)) {
                    hyperparams = model_dict.hyperparams;
                } else {
                    hyperparams = JSON.parse(model_dict.hyperparams);
                }
                if ('params' in model_dict) {
                    if (background_util.isObject(model_dict.params) && !background_util.isEmptyObject(model_dict.params)) {
                        params = model_dict.params;
                    } else if (typeof  model_dict.params === "string"){
                        params = JSON.parse(model_dict.params);
                    }
                }
            }
            let id = -1;
            if ('id' in model_dict) {
                id = Number(model_dict.id);
            }
            let pid = -1;
            if ('pid' in model_dict) {
                pid = Number(model_dict.id);
            }
            reasoner = EasyReadingReasonerFactory.createReasoner(id, pid, model_dict.model_type, hyperparams, params);
            reasoner.active = active;
        }
        return reasoner;
    }

    /**
     * Create a new EasyReadingReasoner instance as given by the parameters
     * @param {number} id: reasoner's ID
     * @param {number} pid: user profile ID associated with the reasoner
     * @param {string} model_type: model class of the reasoner
     * @param {Object.} hyperparams: (key, value) pairs underpinning the model's hyper-parameters
     * @param {Object.} params: (key, value) pairs underpinning the model's parameters/weights
     * @returns {EasyReadingReasoner} a reasoner instance of the given subclass
     */
    static createReasoner(id, pid, model_type, hyperparams, params) {
        let created = true;
        let reasoner = null;
        if (model_type) {
            if (model_type.startsWith('q_learning')) {
                reasoner = new QLearningReasoner();
            } else if (model_type.startsWith('double_q_')) {
                reasoner = new DoubleQLearningReasoner();
            } else if (model_type === 'rnn') {
                reasoner = new ANNReasoner();
            } else {
                created = false;
            }
        } else {
            created = false;
            model_type = '<empty>';
        }
        if (created) {
            reasoner.load(id, pid, hyperparams, params);
            return reasoner;
        } else {
            console.log('Could not create reasoner. Type ' + model_type + ' unknown.');
        }
    }
}
