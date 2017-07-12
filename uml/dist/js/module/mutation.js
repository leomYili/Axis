define([],function(){

    var defaults = {
        'name': "mutation",
        'afterAddServe':$.noop,
        'afterUndo':$.noop,
        'afterRedo':$.noop
    }

    var mutation = function(options){
        this.options = $.extend(true,{},defaults,options);

        this.list = [];
        this.index = 0;
    };

    mutation.prototype = {
        addServe:function(undo,redo){
            if(!_.isFunction(undo) || !_.isFunction(redo)) return false;

            // 说明是在有后续操作时,更新了队列
            if(this.canRedo){
                this.splice(this.index+1);
            };
            this.list.push({
                undo:undo,
                redo:redo
            });

            console.log(this.list);

            this.index = this.list.length - 1;

            _.isFunction(this.options.afterAddServe) && this.options.afterAddServe(this.canUndo(),this.canRedo());
        },
        /**
         * 相当于保存之后清空之前的所有保存的操作
         * @return {[type]} [description]
         */
        reset:function(){
            this.list = [];
            this.index = 0;
        },
        /**
         * 当破坏原来队列时,需要对队列进行修改,
         * index开始的所有存储值都没有用了
         * @param  {[type]} index [description]
         * @return {[type]}       [description]
         */
        splice:function(index){
            this.list.splice(index);
        },
        /**
         * 撤销操作
         * @return {[type]} [description]
         */
        undo:function(){
            if(this.canUndo()){
                this.list[this.index].undo();
                this.index--;

                _.isFunction(this.options.afterUndo) && this.options.afterUndo(this.canUndo(),this.canRedo());
            }
        },
        /**
         * 重做操作
         * @return {[type]} [description]
         */
        redo:function(){
            if(this.canRedo()){
                this.index++;
                this.list[this.index].redo();

                _.isFunction(this.options.afterRedo) && this.options.afterRedo(this.canUndo(),this.canRedo());
            }
        },
        canUndo:function(){
            return this.index !== -1;
        },
        canRedo:function(){
            return this.list.length - 1 !== this.index;
        }
    }

    return mutation;
});
