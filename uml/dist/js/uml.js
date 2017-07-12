define(['pubSub', 'tree.module', 'symbols', 'artboardUml', 'modal', 'request'], function(pubSub, tree, symbols, artboard, modal) {
    // test
    var test = [{
        text: "大学",
        nodes: [{
            text: "db_nju",
            nodes: [{
                text: "tb_depart",
                icon: "glyphicon glyphicon-th",
                sign: "DEPARTMENT1",
                drop: "tree-drop nowrap-one",
            }, {
                text: "tb_employee",
                icon: "glyphicon glyphicon-th",
                sign: "EMPLOYEE1",
                drop: "tree-drop nowrap-one",
            }]
        }, {
            text: "db_mc"
        }]
    }, {
        text: "高中"
    }];
    /* test end */

    var app = function() {
        this.version = "0.1";

        this.pubSub = pubSub.getInstance();
        this.tree = tree("#tree", ".tree-drop", test);
        this.artboard = new artboard(".artboard");
        this.symbols = new symbols();
    }

    app.prototype = {
        initUML: function() {
            this.monitor();
            this.event();
            //this.getUMLData();
        },
        //monitor
        monitor: function() {
            this.pubSub.subscribe('modify relation', this.artboard.setRelation);
        },
        // event
        event: function() {
            this.getLines();
            this.setLines();
            this.lineShow();
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
        getUMLData: function() {
            var _this = this;

            new request(this.getUML, { data: { id: id } }, function(data) {
                    var x2js = new X2JS();
                    var data = x2js.xml_str2json($("#loadmore").val());

                    _this.artboard.load(data["mspplus-root"]);
                    _this.loadModal.modal.modal('toggle');
                },
                function() {
                    console.log("err");
                    return false;
                }
            );
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
                var data = x2js.xml_str2json($("#loadmore").val());

                _this.artboard.load(data["mspplus-root"]);
                _this.loadModal.modal.modal('toggle');
            })
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
        update: function(key, data, scope) {
            key = key || 'update';
            this.pubSub.publish(key, data, scope || this);
        }
    };

    return app;
});
