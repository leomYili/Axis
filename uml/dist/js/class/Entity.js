define(['klass'],function(klass){
    var Entity = klass({
        initialize: function(opts){
            this.propertys();
            this.set(opts);
        },
        propertys: function(){
            this.data = {};
            this.scope = null;
        },
        set: function(opts){
            for(var k in opts){
                this[k] = opts[k];
            }
        }
    });

    return Entity;
})
