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
};

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
};

suprsubDep.prototype.getKey = function(key) {
    this.dep.depend();
    if (key in this.value) return this.value[key];
    else return undefined;
};

suprsubDep.prototype.setKey = function(key, newValue) {
    if (key in this.value && this.value[key] !== newValue) {
        this.value[key] = newValue;
        this.dep.changed();
        this.count++;
    }
    return this.value[key];
};

function after(extraBehavior) {
  return function(original) {
    return function() {
      var returnValue = original.apply(this, arguments)
      extraBehavior.apply(this, arguments)
      return returnValue
    }
  }
}

function before(extraBehavior) {
  return function(original) {
    return function() {
      extraBehavior.apply(this, arguments)
      return original.apply(this, arguments)
    }
  }
}

function override(object, methodName, callback) {
  object[methodName] = callback(object[methodName])
}

funcRuns = {}

override(Deps, 'autorun', after(function(f) {
    if (!(f in funcRuns))
        funcRuns[f] = {count: 1, example: this};
    else
        funcRuns[f] = {count: funcRuns[f].count + 1, example: this};
}));

formatFuncRuns = function(fr, limit) {
    var frPairs = _.pairs(fr).filter(function(x) {return x[1].count >= limit;}),
        output = [];
    frPairs.forEach(function(x, i) {
        output.push({
            fn: x[0].replace('↵', '\n\r'),
            count: x[1].count,
            example: x[1].example
        });
    });
    return output;
}

function logRenders() {
    _.each(Template, function (template, name) {
        var oldRender = template.created;
        var counter = 0;

        template.created = function () {
            console.log(name, "created count: ", ++counter);
            oldRender && oldRender.apply(this, arguments);
        };
    });
}

logRenders();