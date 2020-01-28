let background_util = {
    isEmptyObject: function(obj) {
        let name;
        for (name in obj) {
            if (obj.hasOwnProperty(name)) {
                return false;
            }
        }
        return true;
    },

    getStateRepresentation: function (state) {
        let state_data = null;
        if (background_util.isTensor(state)) {
            state_data = state.dataSync();
        } else {
            state_data = state;
        }
        return state_data;
    },

    isTensor: function (what) {
        let is_t = false;
        if (what) {
            is_t = typeof(what) === 'object' && 'shape' in what;
        }
        return is_t;
    },

    getRandomInt: function(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    },

};

