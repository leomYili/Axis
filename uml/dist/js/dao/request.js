define([], function() {
    var defaults = {
        delay: 0, //延时
        type: "GET",
        dataType: "json",
        timeout: 15000,
        data: {},
        async: true,
        validateData: function() {
            return true
        }
    }

    var model = function(url, options, success, error) {
        if (!url) throw 'error service';
        if ($.isFunction(options)) {
            error = success;
            success = options;
            options = {};
        }

        this.options = $.extend(true, {}, defaults, options);

        success = $.isFunction(success) ? success : $.noop;
        error = $.isFunction(error) ? error : $.noop;

        if ($.isNumeric(this.options.delay) && this.options.delay > 0) {
            setTimeout(function() {
                return this.sendRequest(url, success, error);
            }, delay);
        } else {
            return this.sendRequest(url, success, error);
        }
    }

    model.prototype = {
        sendRequest: function(url, success, error) {
            var _this = this,ops = this.options;

            if(ops.type == 'POST' || ops.type == "post"){
                ops.dataType = 'json';
            }

            $.ajax({
                type:ops.type,
                url:url,
                dataType:ops.dataType,
                timeout:ops.timeout,
                data:ops.data,
                async:ops.async,
                success:function(data){
                    if(ops.validateData()){
                        success && success(data);
                    }else{
                        error && error(data)
                    }

                    return data;
                },
                error:function(xhr,type){
                    error.apply(this,arguments);
                }
            })
        }
    }

    return model;
});
