let background_util = {
    isEmptyObject: function(obj) {
        let name;
        for (name in obj) {
            if (obj.hasOwnProperty(name)) {
                return false;
            }
        }
        return true;
    }
};

