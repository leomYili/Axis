define([],function(){
    var pubSub  = function(){
        this.fns = [];
    }

    pubSub.prototype = {
        subscribe:function(namespace,callback,scope){
            if(typeof namespace === 'function'){
                scope = callback;
                callback = namespace;
                namespace = 'update';
            }
            if(!namespace || !callback) return;
            if(scope) callback.call(scope);
            if(!this.fns[namespace]) this.fns[namespace] = [];
            this.fns[namespace].push(callback);
        },
        unsubscribe:function(namespace){
            if(!namespace) this.fns = [];
            if(this.fns[namespace]) this.fns[namespace] = [];
        },
        publish:function(namespace,data,scope){
            if(!namespace) return;
            if(!this.fns[namespace]) return;

            var scope = scope || window
            var arr = this.fns[namespace],i,len = arr.length;
            for(i=0;i<len;i++){
                arr[i].call(scope,data);
            }
        }
    }

    pubSub.getInstance = function(){
        if(this.instance){
            return this.instance;
        }else{
            return this.instance = new this();
        }
    }

    return pubSub;
})
