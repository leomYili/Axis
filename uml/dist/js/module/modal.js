/**
 * bootstrap modal 封装   用于生成无污染的HTML节点,并提供回调
 * @param  {[type]} ){} [description]
 * @return {[type]}       [description]
 */
define([
    'text!textPath/tpl.flow.config.html',
    'text!textPath/tpl.flow.element.html',
    'text!textPath/tpl.flow.line.html',
    'text!textPath/tpl.entity.html',
    'text!textPath/tpl.save.html'
], function(flowConfigTpl, flowElementTpl,flowLineTpl, entityTpl, saveTpl) {
    var modal = function(type, data) {
        this.type = type;
        this.sid = data.id;
        this.data = data;
        this.init();
    }

    modal.prototype = {
        init: function() {
            this.setLayout();
        },
        initEntity: function() {
            var _this = this;

            var datatype = ["VARCHAR", "INT", "FLOAT", "DOUBLE"];
            var data = {
                datatype: datatype,
                arr: _this.data.arr
            };
            $("#entity .modal-body").empty();
            $(this.renderTpl(entityTpl, data)).appendTo('#entity .modal-body');
            this.modal = $("#entity").modal();
        },
        initSave: function() {
            $("#structure .modal-body").empty();
            $(this.renderTpl(saveTpl, this.data)).appendTo('#structure .modal-body');
            $("#structure").modal();
        },
        initLoad: function() {
            $("#loadmore").val('');
            this.modal = $("#loadsymbols").modal();
        },
        initFlowElement: function() {
            $("#flowChart .modal-body").empty();
            $(this.renderTpl(flowElementTpl, this.data)).appendTo('#flowChart .modal-body');
            this.modal = $("#flowChart").modal();
        },
        initFlowLine: function() {
            $("#flowLine .modal-body").empty();
            $(this.renderTpl(flowLineTpl, this.data)).appendTo('#flowLine .modal-body');
            this.modal = $("#flowLine").modal();
        },
        initFlowConfig: function() {
            $("#flowConfig .modal-body").empty();
            $(this.renderTpl(flowConfigTpl, this.data)).appendTo('#flowConfig .modal-body');
            this.modal = $("#flowConfig").modal();
        },
        // set
        setLayout: function() {
            var _this = this;

            switch (this.type) {
                case "entity":
                    _this.initEntity();
                    break;
                case "save":
                    _this.initSave();
                    break;
                case "load":
                    _this.initLoad();
                    break;
                case "flow-element":
                    _this.initFlowElement();
                    break;
                case "flow-line":
                    _this.initFlowLine();
                    break;
                case "flow-config":
                    _this.initFlowConfig();
                    break;
            }
        },
        // get
        renderTpl: function(tpl, data) {
            if (!$.isFunction(tpl)) tpl = _.template(tpl);
            return tpl(data)
        }
    }

    return modal;
});
