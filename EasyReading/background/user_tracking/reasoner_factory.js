class EasyReadingReasonerFactory {

    createReasoner(model_type, hyperparams) {
        let created = true;
        let reasoner = null;
        if (model_type) {
            if (model_type.startsWith('q_learning')) {
                reasoner = QLearningReasoner(hyperparams);
            } else if (model_type.startsWith('double_q_')) {
                reasoner = DoubleQLearningReasoner(hyperparams);
            } else {
                created = false;
            }
        } else {
            created = false;
            model_type = '<empty>';
        }
        if (created) {
            return reasoner;
        } else {
            console.log('Could not create reasoner. Type ' + model_type + ' unknown.');
        }
    }
}
