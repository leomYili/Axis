define(['pubSub', 'symbols', 'artboardFlow', 'modal'], function(pubSub, symbols, artboard, modal) {

    var app = function() {
        this.version = "0.1";

        this.pubSub = pubSub.getInstance();
        this.artboard = new artboard(".artboard");
        this.symbols = new symbols();
    }

    app.prototype = {
        initFLOW: function() {
            this.monitor();
            this.event();
            this.lineShow();
        },
        //monitor
        monitor: function() {},
        // event
        event: function() {
            this.drag();
            this.getLines();
            this.setLines();
            this.verify();
            this.mutation();
        },
        /**
         * 获取UML关系图的数据结构
         * @return {[type]} [description]
         */
        getLines: function() {
            var _this = this;
            $("#save").click(function() {
                new modal("save", _this.artboard.getData());
            });
        },
        /**
         * 载入数据,动态解析成内部的symbols对象
         */
        setLines: function() {
            var _this = this;
            $("#load").click(function() {
                _this.loadModal = new modal("load", {});
            });

            $("#xmltojson").click(function() {
                var x2js = new X2JS();
                var data = (x2js.xml_str2json($("#loadmore").val()))["mspplus-root"];

                _this.artboard.load(data);
                _this.loadModal.modal.modal('toggle');
            })
        },
        bindConfig: function() {
            var _this = this;

        },
        verify: function(){
            var _this = this;

            $("#verify").click(function(){
                _this.artboard.verify();
            });
        },
        drag: function() {
            $('[data-shape]').draggable({
                helper: 'clone',
                appendTo: ".artboard",
                cursor: "move",
                delay: "300",
                distance: "10",
                scope: "axis",
                zIndex: 9999,// 与新增的层级功能相对照
                scroll: false
            });
        },
        /**
         * 判断是否可以进行连线
         * @return {[type]} [description]
         */
        lineShow: function() {
            $('.header_item[data-tool="lineshow"]').click(function() {
                var self = this;

                if ($(".symbol_shade").length == 0) {
                    $(self).removeClass('active');
                    return false;
                }

                if ($(".symbol_shade").hasClass('symbol_shade-hide')) {
                    $(".layout").removeClass('layout-line');
                    $(self).removeClass('active');
                    $(".symbol_shade").removeClass('symbol_shade-hide');
                } else {
                    $(".layout").addClass('layout-line');
                    $(self).addClass('active');
                    $(".symbol_shade").addClass('symbol_shade-hide');
                }
            });
        },
        mutation:function(){
            var _this = this;
            $("#undo").click(function(){
                if($(this).hasClass('active')){
                    _this.artboard.undo();
                }
            });
            $("#redo").click(function(){
                if($(this).hasClass('active')){
                    _this.artboard.redo();
                }
            });
        }
    };

    return app;
});
