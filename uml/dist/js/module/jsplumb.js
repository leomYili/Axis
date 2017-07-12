/**
 * jsplumb 的内部配置
 * @return {[type]}       [description]
 */
define(['throttle'], function(throttle) {
    var defaults = {
        Anchor: "Continuous", // 坐标位置
        Container: null,
        ConnectionsDetachable: false, // 是否可以手动分离连接线
        Connector: ["Straight"], // 连线类型
        ConnectionOverlays: [],
        Endpoint: "Dot", // 端点类型
        EndpointStyle: { stroke: "#833", fill: "#F2F2F2", radius: 2.5, strokeWidth: 1 },
        EndpointHoverStyle: null,
        PaintStyle: {},
        MaxConnections: 1, // 连线限制条数
        Scope: "axis-line",
        DragOptions: { cursor: "pointer", zIndex: 15 },
        groupDragStop: $.noop() // 自定义函数
    };

    var jspl = function(opts) {
        if (!opts) opts = {};

        this.options = $.extend(true, {}, defaults, opts);
        this.init(opts);
    }

    jspl.prototype = {
        init: function(opts) {
            var _this = this;
            window.jsPlumb.ready(function() {
                _this.line = window.jsPlumb.getInstance(_this.options);
                _this.select = _this.line.select;
                _this.selectEndpoints = _this.line.selectEndpoints;
            });
        },
        fire: function(callback, scope) {
            scope = scope || this;
            this.line.batch(callback);
            window.jsPlumb.fire("jsPlumbDemoLoaded", this.line);
        },
        // jsPlumb api
        /**
         * 对于元件增加端点
         * 端点的z-index需要与symbol保持一致
         * @param {[type]} el [description]
         */
        addEndpointInSymbol: function(el) {
            var _this = this;

            var zIndex = el.css("z-index");
            this.line.batch(function() {
                $.each(["Top", "Left", "Right", "Bottom"], function(i, t) {
                    _this.line.addEndpoint(el.get(0), {
                        isSource: el.find(".symbol_flow-end").length > 0 ? false : true,
                        isTarget: el.find(".symbol_flow-start").length > 0 ? false : true,
                        anchor: t,
                        cssClass: "cursor-crosshair",
                        paintStyle: {
                            stroke: "#833",
                            fill: "#F2F2F2",
                            radius: 2,
                            strokeWidth: 1,
                        },
                        connectionsDetachable: true,
                        maxConnections: -1,
                        allowLoopback: false
                    });
                });

                if (el.find(".symbol_flow-end").length > 0) {
                    _this.selectEndpoints({ target: el.get(0) }).each(function(endpoint) {
                        $(endpoint.canvas).css("z-index", zIndex);
                    });
                } else {
                    _this.selectEndpoints({ source: el.get(0) }).each(function(endpoint) {
                        $(endpoint.canvas).css("z-index", zIndex);
                    });
                }

                _this.line.repaintEverything();
            });

        },
        addGroup: function(element, dragStop) {
            var _this = this;

            var id = _.uniqueId('group_');
            this.line.addGroup({
                el: element,
                id: id,
                draggable: true,
                constrain: true,
                dragOptions: {
                    stop: function(e) {
                        _.isFunction(dragStop) && dragStop(e);
                    }
                }
            });

            return id;
            /*this.line.draggable(element, {
                containment: true
            });*/
        },
        /**
         * 闭环处理
         * @param  {[type]} el [description]
         * @return {[type]}    [description]
         */
        allowLoopback: function(el) {
            this.line.connect({
                source: el,
                target: el,
                anchors: ["Top", "Right"]
            })
        },
        afreshUml: function(source, target) {
            console.log(source, target);
            this.line.connect({
                source: source.get(0),
                target: target.get(0),
                connector: "Flowchart",
            });
        },
        connect: function(opts) {
            var _defaults = {};
            // 配置需要进一步处理
            var config = $.extend(true, _defaults, opts);
            return this.line.connect(config);
        },
        connectDashboard: function(source, target) {
            if (!source || !target) return;

            var sourceSite = ($(source).hasClass('symbol_pivot-start') || $(source).hasClass('symbol_pivot-end') || $(target).hasClass('symbol_pivot-start') || $(target).hasClass('symbol_pivot-end')) ? "Center" : "Continuous";

            this.line.connect({ source: source, target: target, anchors: [sourceSite, "TopLeft"] });
        },
        connectSymbolInDashboard: function(source, target) {
            if (target.find(".symbol_pivot-start").length > 0) {
                target = target.find(".symbol_pivot-start");
            }
            this.line.connect({
                source: source,
                target: target,
                parameters:{
                    "line2":"dashboard"
                }
            });
        },
        /**
         * uml图中用于重新连接主键
         * @param  {[type]} source [description]
         * @param  {[type]} target [description]
         * @return {[type]}        [description]
         */
        connectSelf: function(source, target) {
            var _this = this;

            if (!source || !target) return;

            this.line.batch(function() {
                var connection = _this.line.connect({
                    source: source,
                    target: target,
                    paintStyle: { stroke: "#00a65a" },
                    overlays: [
                        ["Label", { label: "n", id: "label-n", location: 0.25, cssClass: "jspl-label" }],
                        ["Label", { label: "1", id: "label-1", location: 0.75, cssClass: "jspl-label" }]
                    ]
                });

                _this.line.repaintEverything();

                return connection;
            })
        },
        /**
         * uml专用
         * @param  {[type]} el            [description]
         * @param  {[type]} anchor        [description]
         * @param  {[type]} many          [description]
         * @param  {[type]} allowLoopback [description]
         * @return {[type]}               [description]
         */
        makeEndpoint: function(el, anchor, many, allowLoopback) {
            this.line.makeSource(el, {
                anchor: anchor,
                maxConnections: many,
                allowLoopback: allowLoopback
            });
            this.line.makeTarget(el, {
                anchor: anchor,
                maxConnections: -1,
                allowLoopback: allowLoopback //禁止回环
            });
        },
        makeEndpointInFlow: function(el, anchor) {
            var _this = this;

            var common = {
                dropOptions: {
                    hoverClass: "dragHover"
                }
            };
            if (el.find(".symbol_flow-end").length > 0) {
                _this.line.makeTarget(el, {
                    filter: ".symbol_flow-item img",
                    anchor: anchor,
                    maxConnections: -1
                }, common);
            } else if (el.find(".symbol_flow-start").length > 0) {
                _this.line.makeSource(el, {
                    filter: ".symbol_flow-item img",
                    anchor: anchor,
                    maxConnections: -1
                }, common);
            } else {
                _this.line.makeSource(el, {
                    filter: ".symbol_flow-item img",
                    anchor: anchor,
                    maxConnections: -1
                }, common);
                _this.line.makeTarget(el, {
                    filter: ".symbol_flow-item img",
                    anchor: anchor,
                    maxConnections: -1
                }, common);
            }
        },
        makeEndpointToConcurrence: function(el, zIndex) {
            var _this = this;

            var start = el.find(".symbol_pivot-start").css("z-index", zIndex).get(0),
                end = el.find(".symbol_pivot-end").css("z-index", zIndex).get(0);

            var config = {
                anchor: "Center",
                maxConnections: -1,
                dropOptions: {
                    hoverClass: "dragHover"
                },
                allowLoopback: false
            };

            // 开始可以当做源点和终点
            $.each([start, end], function() {
                _this.line.makeSource(this, config);
                _this.line.makeTarget(this, config);
            });
        },
        getAllConnections: function() {
            return this.line.getAllConnections();
        },
        getLabel: function() {
            return this.line.select().getOverlay('label');
        },
        getArrow: function() {
            return this.line.select().getOverlay("arrow");
        },
        setRelation: function(opts) {
            // 这里只需要更换文字就可以了,之后进行修改
            this.line.importDefaults({
                ConnectionOverlays: [
                    ["Arrow", { location: 1, id: "arrow", length: 10, foldback: 0, width: 10 }],
                    ["Label", { label: opts.type, id: "label", cssClass: "jspl-label" }]
                ],
                PaintStyle: { stroke: opts.color }
            });
        },
        // custom
        getElemeny: function(id) {
            if (!id || !_.isString(id)) return;

            return $("#" + id).get(0);
        },
        /**
         * 初始化一个实体类
         */
        initEntity: function(id) {
            var _this = this;

            var el = _this.getElemeny(id);

            _this.addGroup(el, this.options.groupDragStop);
            _this.initPorperty($(el).find(".symbol_item"));
            //_this.makeEndpoint(el, ["Top", "Right", "Bottom", "Left"]);
        },
        initShape: function(el, callback) {
            var _this = this;

            _this.line.draggable(el, {
                containment: true,
                drag: function() {
                    $(".symbol_control").css("display", "none");
                    _.throttle(_this.line.repaintEverything(), 300);
                },
                stop: function(e) {
                    _this.line.repaintEverything();
                    _.isFunction(_this.options.groupDragStop) && _this.options.groupDragStop(e);
                }
            });

            if (el.find(".symbol_flow-concurrence").length > 0) {
                var concurrence = el.find(".symbol_flow-concurrence");
                _this.makeEndpointToConcurrence(concurrence, el.css("z-index"));
                _.isFunction(callback) && callback(concurrence);
            } else {
                //_this.addEndpointInSymbol(el);
                _this.makeEndpointInFlow(el, ["Continuous", { faces: ["top", "right", "bottom", "left"] }])
            }
        },
        /**
         * 初始化类中属性,
         * 默认每个外键只使用一次
         */
        initPorperty: function(el) {
            var _this = this;

            _this.makeEndpoint(el, ["Continuous", { faces: ["right", "left"] }], 1, false);
        }
    }

    jspl.getInstance = function(opts) {
        if (this.instance) {
            return this.instance;
        } else {
            return this.instance = new this(opts);
        }
    }

    return jspl;
});
