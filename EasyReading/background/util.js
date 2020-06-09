/**
 * Background script utility methods
 * @type {{isObject: (function(*): boolean),
 * isEmptyObject: background_util.isEmptyObject,
 * getStateRepresentation: (function(Object): *),
 * isTensor: (function(*): boolean),
 * getRandomInt: (function(number, number): number),
 * reasonerIsActive(): boolean}}
 */
let background_util = {

    /**
     * Return whether the passed-in element is an object
     * @param {*} thing: the element to check
     * @returns {boolean} whether the element is an object
     */
    isObject: function(thing) {
      return thing !== null && typeof thing === 'object';
    },

    /**
     * Return whether the passed-in object is empty
     * @param {Object.} obj: an instance
     * @returns {boolean}: True if the object is empty; False otherwise
     */
    isEmptyObject: function(obj) {
        let name;
        for (name in obj) {
            if (obj.hasOwnProperty(name)) {
                return false;
            }
        }
        return true;
    },

    /**
     * Return the data of the given state
     * @param {Object.} state: a state representation in the form of a plain object or a tensor
     * @returns {Object.} Values of the state, synchronously downloaded from a tensor if necessary
     */
    getStateRepresentation: function (state) {
        let state_data = null;
        if (background_util.isTensor(state)) {
            state_data = state.dataSync();
        } else {
            state_data = state;
        }
        return state_data;
    },

    /**
     * Return whether the passed-in element is a Tensorflow.js tensor
     * @param {*} what: the element to check
     * @returns {boolean} whether the element is a Tensorflow.js tensor
     */
    isTensor: function (what) {
        let is_t = false;
        if (what) {
            is_t = typeof(what) === 'object' && 'shape' in what;
        }
        return is_t;
    },

    /**
     * Return a random integer within a range
     * @param {number} min: minimum value of the range of possible values
     * @param {number} max: maximum value of the range of possible values
     * @returns {number}: a random integer in the [min, max] range
     */
    getRandomInt: function(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    },

    /**
     * Return whether there is a currently running reasoner in the extension
     * @returns {boolean}: True if a reasoner instance is currently running; False otherwise
     */
    reasonerIsActive() {
        return background.reasoner && background.reasoner.active;
    }

};

