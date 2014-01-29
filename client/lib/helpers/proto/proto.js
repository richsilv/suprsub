suprsubDep = function(initial) {
  this.value = initial;
  this.count = 0;
  this.dep = new Deps.Dependency();
};

suprsubDep.prototype.get = function() {
    this.dep.depend();
    return this.value;
}

suprsubDep.prototype.set = function(newValue){
    if (this.value !== newValue) {
        this.value = newValue;
        this.dep.changed();
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