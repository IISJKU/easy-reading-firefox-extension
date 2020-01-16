class EasyReadingReasonerFactory {

    static loadReasoner(model_dict) {
        let reasoner = null;
        let hyperparams = {};
        let params = {};
        if ('model_type' in model_dict) {
            if ('hyperparams' in model_dict) {
                hyperparams = model_dict.hyperparams;
                if ('params' in model_dict && !background_util.isEmptyObject(model_dict.params)) {
                    params = model_dict.params;
                }
            }
            let id = -1;
            if ('id' in model_dict) {
                id = model_dict.id;
            }
            reasoner = EasyReadingReasonerFactory.createReasoner(id, model_dict.model_type, hyperparams, params);
        }
        return reasoner;
    }

    static createReasoner(id, model_type, hyperparams, params) {
        let created = true;
        let reasoner = null;
        if (model_type) {
            if (model_type.startsWith('q_learning')) {
                reasoner = QLearningReasoner();
            } else if (model_type.startsWith('double_q_')) {
                reasoner = DoubleQLearningReasoner();
            } else {
                created = false;
            }
        } else {
            created = false;
            model_type = '<empty>';
        }
        if (created) {
            reasoner.load(id, params, hyperparams);
            return reasoner;
        } else {
            console.log('Could not create reasoner. Type ' + model_type + ' unknown.');
        }
    }
}
