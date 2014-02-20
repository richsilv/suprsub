window._allDeps = [];

suprsubDep = function(initial) {
  this.value = initial;
  this.count = 0;
  this.dep = new Deps.Dependency();
  window._allDeps.push(this);
};

suprsubDep.prototype.get = function() {
    this.dep.depend();
    return this.value;
}

suprsubDep.prototype.set = function(newValue){
    if (this.value !== newValue) {
        this.value = newValue;
        if (this.count < appVars.maxInvalidate)
            this.dep.changed();
        else {
            console.log("stopped at", arguments.callee.caller)
            console.trace()
        }
        this.count++;
    }
    return this.value;
}

suprsubDep.prototype.getKey = function(key) {
    this.dep.depend();
    if (key in this.value) return this.value[key];
    else return undefined;
}

suprsubDep.prototype.setKey = function(key, newValue) {
    if (key in this.value && this.value[key] !== newValue) {
        this.value[key] = newValue;
        this.dep.changed();
        this.count++;
    }
    return this.value[key];
}