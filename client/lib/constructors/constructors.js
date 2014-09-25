var DEBUG_ALL = false;

SuprSubDep = function(initial, name, maxInvalidate) {
  this.value = initial;
  this.count = 0;
  this.dep = new Deps.Dependency();
  this.name = name;
  this.maxInvalidate = maxInvalidate || (DEBUG_ALL ? 100 : 0);
};

SuprSubDep.prototype.get = function() {
    this.dep.depend();
    return clone(this.value);
};

SuprSubDep.prototype.set = function(newValue){
    if (this.value !== newValue) {
        this.value = newValue;
        if (this.count < this.maxInvalidate || !this.maxInvalidate)
            this.dep.changed();
        else {
            console.log("stopped at", arguments.callee.caller)
            console.trace()
        }
        this.count++;
    }
    return this.value;
};

SuprSubDep.prototype.getKey = function(key) {
    this.dep.depend();
    if (this.value && key in this.value) return clone(this.value[key]);
    else return undefined;
};

SuprSubDep.prototype.setKey = function(key, newValue) {
    if (key in this.value && this.value[key] !== newValue) {
        this.value[key] = newValue;
        this.dep.changed();
        this.count++;
    }
    return this.value[key];
};

function clone(src) {
    function mixin(dest, source, copyFunc) {
        var name, s, i, empty = {};
        for(name in source){
            // the (!(name in empty) || empty[name] !== s) condition avoids copying properties in "source"
            // inherited from Object.prototype.  For example, if dest has a custom toString() method,
            // don't overwrite it with the toString() method that source inherited from Object.prototype
            s = source[name];
            if(!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))){
                dest[name] = copyFunc ? copyFunc(s) : s;
            }
        }
        return dest;
    }

    if(!src || typeof src != "object" || Object.prototype.toString.call(src) === "[object Function]"){
        // null, undefined, any non-object, or function
        return src; // anything
    }
    if(src.nodeType && "cloneNode" in src){
        // DOM Node
        return src.cloneNode(true); // Node
    }
    if(src instanceof Date){
        // Date
        return new Date(src.getTime()); // Date
    }
    if(src instanceof RegExp){
        // RegExp
        return new RegExp(src);   // RegExp
    }
    var r, i, l;
    if(src instanceof Array){
        // array
        r = [];
        for(i = 0, l = src.length; i < l; ++i){
            if(i in src){
                r.push(clone(src[i]));
            }
        }
        // we don't clone functions for performance reasons
        //      }else if(d.isFunction(src)){
        //          // function
        //          r = function(){ return src.apply(this, arguments); };
    }else{
        // generic objects
        r = src.constructor ? new src.constructor() : {};
    }
    return mixin(r, src, clone);
}