define([], function() {
    return function(fn,interval){
        var canRun = true;

        return function(){
            if(!canRun) return;
            canRun = false;
            setTimeout(function(){
                fn.apply(this,arguments);
                canRun = true;
            },interval ? interval : 300);
        };
    };
});
