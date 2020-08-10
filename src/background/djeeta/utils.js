String.prototype.splitEx = function(separator, limit) {
    let str = this.split(separator);

    if(str.length > limit) {
        var ret = str.splice(0, limit);
        ret.push(str.join(separator));

        return ret;
    }

    return str;
}

Array.prototype.findMax = function(propToEval) {
    let arr = this.map(x => x[propToEval])
    let max = Math.max.apply(Math, arr);
    return this.find(x => x[propToEval] == max);
}

Array.prototype.findMin = function(propToEval) {
    let arr = this.map(x => x[propToEval])
    let max = Math.max.apply(Math, arr);
    return this.find(x => x[propToEval] == max);
}

function createNumberProxy() {
    return new Proxy({}, {
        get(target, prop) {
            if (prop in target) {
                return target[prop];
            } else {
                return 0; // default value
            }
        }
    })
}