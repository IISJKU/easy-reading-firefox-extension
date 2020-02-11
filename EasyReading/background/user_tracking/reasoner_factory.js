class EasyReadingReasonerFactory {

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
