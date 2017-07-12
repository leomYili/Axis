define([], function() {
    "use strict"

    var middleWare = function() {
        this.cache = [];
        this.options = null;
    };

    middleWare.prototype = {
        use: function(fn) {
            if (typeof fn !== 'function') {
                throw 'middleWar must be a function';
            }
            this.cache.push(fn);
            return this;
        },
        next: function() {
            if (this.middleWares && this.middleWares.length > 0) {
                var ware = this.middleWares.shift();
                ware.call(this, this.options, this.next.bind(this));
            }
        },
        handleRequest: function(options) {
            this.middleWares = this.cache.map(function(fn) {
                return fn;
            });
            this.options = options;
            this.next();
        }
    };

    middleWare.getInstance = function(){
        if(this.instance){
            return this.instance;
        }else{
            return this.instance = new this();
        }
    }

    return middleWare;
});
