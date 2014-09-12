suprsubDep = function(initial, name) {
  this.value = initial;
  this.count = 0;
  this.dep = new Deps.Dependency();
  this.name = name;
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



function monitorRenders() {

    var _this = this;
    
    this.waitList = {};

    _.each(Object.keys(Template), function(t) {

        var template = Template[t];

        if (template instanceof Blaze.Template) {

            var oldCreated = template.created,
                oldRendered = template.rendered,
                counter = 0,
                newId = Random.id();

            template.created = function () {
                console.log("added id " + newId + " to waitList");
                this.id = newId;
                _this.waitList[newId] = this;
                console.log("waitList is ", _this.waitList);
                oldCreated && oldCreated.apply(this, arguments);
            };
            template.rendered = function() {
                console.log("removed id " + this.id + " from waitList");
                delete _this.waitList[this.id];
                console.log("waitList is ", _this.waitList);            
                oldRendered && oldRendered.apply(this, arguments);
            }
        }
    });

    this.unrendered = function() {
        
        var results = [];

        _.each(Object.keys(Template), function(t) {

            var template = Template[t];

            console.log(template, template.id);

            if (template instanceof Blaze.Template && _this.waitList.indexOf(template.id) > -1) results.push(template);

        });

        return results;        

    }

}

templateMonitor = new monitorRenders();