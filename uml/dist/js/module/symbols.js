/**
 * symbol 类的组装与生成
 * @return {class}       [实体类]
 */
define([
    'text!textPath/tpl.cls.html',
    'text!textPath/tpl.flow.shape.html',
    'klass',
    'Symbol',
    'request',
    'middleWare'
], function(clsTpl, flowShapeTpl, klass, Symbol, request, middleWare) {
    var url1 = "../apis/department.json",
        url2 = "../apis/employee.json"

    var produceSymbol = middleWare.getInstance();

    // symbol service
    return klass(Symbol, {
        init: function(sign, callback) {
            if (!sign || sign == '') {
                throw 'no sign!';
            } else {
                this.sign = sign
            }
            this.setData(this.sign, function(data) {
                callback();
            });
        },
        /**
         * 通过预设的形状,判断所使用的模板和数据结构
         */
        setShape: function(shapename) {
            return this.renderTpl(flowShapeTpl, { type: shapename });
        },
        setData: function(sign, callback) {
            var _this = this;

            new request(sign == "DEPARTMENT1" ? url1 : url2, { data: { sign: sign } }, function(data) {
                    _this.data = _this.verifyData(sign, data);

                    console.log(_this.data);
                    _this.tpl = _this.renderTpl(clsTpl, data);
                    $.isFunction(callback) && callback.call(this, data);
                },
                function() {
                    console.log("err");
                    return false;
                }
            );
        },
        loadData: function(data) {
            this.data = data;
            return this.renderTpl(clsTpl, data);
        },
        verifyData: function(sign, data) {
            var _this = this;

            data.id = sign;

            $.each(data.properties, function(i, t) {
                if (t.foreignkey == "true" || t.foreignkey == true) {
                    t.foreignkey = {
                        "associateentity": t.foreignentityid,
                        "aliasname": t.associatealias,
                        "displayname": "从属于"
                    };
                    delete data.properties[i].foreignentityid;
                    delete data.properties[i].associatealias
                }else{
                    t.foreignkey = {};
                    delete data.properties[i].foreignentityid;
                    delete data.properties[i].associatealias
                }
            });

            return data;
        },
        // set
        layout: function() {
            var _this = this;
        }
    });
});
