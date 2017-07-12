/**
 * artboard
 * @return {class}       [画板]
 */
define([
    'text!textPath/tpl.flow.xml.html',
    'text!textPath/tpl.relation.html',
    'text!textPath/tpl.cls.content.html',
    'text!textPath/tpl.dashboard.flow.html',
    'pubSub',
    'mt',
    'middleWare',
    'symbols',
    'jsplumb',
    'contextmenu',
    'modal',
    'graph',
    'resize',
    'mutation'
], function(flowXML, relationTpl, clsContent, dashboardFlow, pubSub, mt, middleWare, symbols, jsplumb, contextmenu, modal, graph, resize, mutation) {

    var defaults = {
        debug: true,
        className: {},
        selector: {
            layout: ".layout",
            artboard: ".artboard",
            artboardMenu: "#artboard_context-menu",
            symbolMenu: "#box_context-menu",
            symbolStart: '.symbol_flow-start',
            symbolConcurrence: '.symbol_flow-concurrence',
            symbolEnd: '.symbol_flow-end',
            lineMenu: "#line_context-menu",
            boxShade: ".symbol_shade",
            updateFlow: "#updateFlow",
            updateLine: "#updateLine",
            updateConfig: "#updateConfig"
        },
        tool: {
            lineShow: '.header_item[data-tool="lineshow"]',
            undo: '#undo',
            redo: '#redo'
        }
    }

    var artboard = function(el, data) {
        this.options = $.extend(true, {}, defaults);

        this.el = el;
        this.data = data || {};
        this.symbols = [];
        this.lines = [];
        this.config = {};
        this.sid = 0;
        this.verifyes = false; // 只有通过验证,才能保存数据,只要增加节点,或者变更节点,该值都应该为false
        this.batch = false; // 作为是否批量载入数据的标识,用于撤销和重做的判断
        this.batchRedo = false; // 作为是否为批量载入数据的重做的标识,只有批量重做时,才为true
        this.batchDelete = false; // 只有在批量删除时,才为true,用于阻止分离更新

        this.pubSub = pubSub.getInstance();
        this.jsplumb = jsplumb.getInstance({
            ConnectionsDetachable: true,
            Container: $(el).get(0),
            Connector: ["Flowchart", { stub: [30, 30], cornerRadius: 3, alwaysRespectStubs: false, gap: 2 }],
            ConnectionOverlays: [
                ["Arrow", { location: 1, id: "arrow", length: 10, foldback: 0, width: 10 }]
            ],
            PaintStyle: { stroke: "#456", strokeWidth: 1 },
            groupDragStop: _.bind(this.groupDragStop, this),
            MaxConnections: -1
        });
        //this.contextmenu = new contextmenu("artboard", this);
        //["Label", { label: "下一步", id: "step", location: 0.5, cssClass: "jspl_flow-label" }]

        // 内部数据源
        this.init();
    }

    /**
     * 以symbols作为内部数据源,只更新内部数据源,来生成最终的XML
     * 其中,内部使用的sid和外部使用的ID也就是表的唯一标识不同,只是内部区分
     * @type {Object}
     */
    artboard.prototype = {
        init: function() {
            this.position();
            this.monitor();
            this.event();
            this.resize = new resize(this.el, {
                root: $(this.el),
                refresh: _.bind(this.refresh, this),
                dragStop: _.bind(this.nodeDragStop, this)
            });
            this.mutation = new mutation({
                afterAddServe: _.bind(this.canUnRedo, this),
                afterUndo: _.bind(this.canUnRedo, this),
                afterRedo: _.bind(this.canUnRedo, this)
            });
            if (!$.isEmptyObject(this.data)) this.load(this.data);
        },
        /**
         * 用于处理内部生成的字符串,并渲染成关系图
         * @return {[type]} [description]
         */
        load: function(data) {
            var _this = this;

            this.empty();
            this.createSymbols(data);
        },
        debug: function() {
            var _this = this;
            if (_this.options.debug) {
                _this.debug = Function.prototype.bind.call(console.info, console, "axisLine" + _.now() + "->");
                _this.debug.apply(console, arguments);
            }
        },
        empty: function() {
            this.symbols = [];
            this.lines = [];
            this.config = [];
        },
        error: function() {
            var _this = this;
            if (_this.options.debug) {
                _this.debug = Function.prototype.bind.call(console.error, console, "axisLine" + _.now() + "->");
                _this.debug.apply(console, arguments);
            }
        },
        refresh: function() {
            this.jsplumb.line.repaintEverything()
        },
        inArrayObj: function(key, val, array) {
            var index = -1;
            var _array = array;
            if (!_array.length) return index;
            for (var i = 0; i < _array.length; i++) {
                if (_array[i][key] == val) {
                    return i;
                }
            };

            return index;
        },
        serializeJSON: function(obj, el) {
            var _this = this;

            var o = {};
            $.each(obj, function() {
                if (o[this.name]) {
                    if (!o[this.name].push) {
                        o[this.name] = [o[this.name]];
                    }
                    o[this.name].push(this.value || '');
                } else {
                    o[this.name] = this.value || '';
                }
            });
            var $radio = el.find("input[type=radio],input[type=checkbox]");
            $.each($radio, function() {
                if (!o.hasOwnProperty(this.name)) {
                    o[this.name] = $(this).attr('type') == "checkbox" ? '' : false;
                }
            });
            return o;
        },

        undo: function() {
            this.debug("undo");
            this.mutation.undo();
        },
        redo: function() {
            this.debug("redo");
            this.mutation.redo();
        },
        canUnRedo: function(undo, redo) {
            if (undo) {
                $(this.options.tool.undo).addClass('active');
            } else {
                $(this.options.tool.undo).removeClass('active');
            }

            if (redo) {
                $(this.options.tool.redo).addClass('active');
            } else {
                $(this.options.tool.redo).removeClass('active');
            }
        },
        // 监听数据变化以及中间件通信
        monitor: function() {
            this.pubSub.subscribe('add symbol', this.addSymbol);
            this.pubSub.subscribe('add concurrence in symbol', this.addConcurrenceInSymbol);
            this.pubSub.subscribe('add symbol in tool', this.addSymbolInTool);

            this.pubSub.subscribe('update flow', this.updateFlow);
            this.pubSub.subscribe('update flow in pos', this.updateFlowInPos);
            this.pubSub.subscribe('update flow in resize', this.updateFlowInResize);
            this.pubSub.subscribe('update config', this.updateConfig);
            this.pubSub.subscribe('update line', this.updateLine);

            this.pubSub.subscribe('delete symbols', this.deleteSymbols);
            this.pubSub.subscribe("delete line", this.deleteLine);
            this.pubSub.subscribe("delete line to move", this.deleteLineToMove);
        },
        update: function(key, data, scope) {
            key = key || 'update';
            this.pubSub.publish(key, data, scope || this);
        },
        // render
        render: function() {},
        renderTpl: function(tpl, data) {
            if (!_.isFunction(tpl)) tpl = _.template(tpl);
            return tpl(data)
        },
        /**
         * 引入层级结构
         * 通过z-index的判断,进行功能的修改
         * 第一层的z-index从1000开始
         * 此后每一层减少10
         * @param  {[type]} tpl [description]
         * @param  {[type]} pos [description]
         * @param  {[type]} sid [description]
         * @return {[type]}     [description]
         */
        renderSymbol: function(tpl, pos, sid, level, callback) {
            var _this = this;

            var css = { left: pos.left, top: pos.top };

            if (pos.width != 0) css.width = pos.width;
            if (pos.height != 0) css.height = pos.height;

            var el = $(tpl).css(css).attr("id", sid).attr("data-level", level).appendTo(this.el);

            if ($(_this.options.tool.lineShow).hasClass('active')) {
                el.find(_this.options.selector.boxShade).addClass("symbol_shade-hide");
            }

            this.bindContextMenu(el);
            this.jsplumb.initShape(el, _.bind(this.dropConcurrence, this));
            this.verifyes = false;

            $.isFunction(callback) && callback.call(this, el);
        },
        renderConcurrenceInSymbol: function(tpl, pos, sid, target, level, callback) {
            var _this = this;
            var drop = $("#" + target).find(".symbol_flow-item").first();

            var el = $(tpl).css({ left: pos.left, top: pos.top }).attr("id", sid).attr("data-level", level).appendTo(drop);

            var adaption = _this.selfAdaption(drop, el, true);
            _this.jsplumb.line.repaintEverything();

            if ($(_this.options.tool.lineShow).hasClass('active')) {
                el.find(_this.options.selector.boxShade).addClass("symbol_shade-hide");
            }
            this.bindContextMenu(el);
            this.jsplumb.initShape(el, _.bind(this.dropConcurrence, this));
            this.verifyes = false;

            $.isFunction(callback) && callback.call(this, el, adaption);
            //this.jsplumb.line.addToGroup(drop.attr("data-groupid"),el.get(0))
        },
        renderFlowUpdate: function(sid, data) {
            $("#" + sid).attr("data-sign", data.sign).find(".symbol-label").text(data.shapeName);
            this.flowElementModal.modal.modal('toggle');
            this.jsplumb.line.repaintEverything();
        },
        renderLineUpdate: function(data) {
            var el = this.jsplumb.line.select({ source: $("#" + data.from).get(0) }).getOverlay("step")[0][0];

            $(el.canvas).text(data.shapeName);
            this.flowLineModal.modal.modal('toggle');
        },
        renderDashboard: function(info, event) {
            var _this = this;

            var artboard = $(this.options.selector.artboard),
                artboardSize = artboard.offset(),
                left = event.clientX - artboardSize.left,
                top = event.clientY - artboardSize.top,
                ifStart = (artboard.find(".symbol_flow-start").length > 0 || (!$("#" + info.sourceId).hasClass('symbol_pivot-start') || !$("#" + info.sourceId).hasClass('symbol_pivot-end'))) ? true : false,
                ifEnd = artboard.find(".symbol_flow-end").length > 0 || !$("#" + info.sourceId).hasClass('symbol_pivot-end') ? true : false;

            if (left < 0 || top < 0) {
                return false;
            }

            var el = $(_this.renderTpl(dashboardFlow, { start: ifStart, end: ifEnd })).css({ left: left, top: top }).appendTo(_this.el);

            this.jsplumb.connectDashboard($("#" + info.sourceId).get(0), el.get(0), { anchor: "TopRight" });

            this.dashboardSource = $("#" + info.sourceId).get(0);
            this.blurDashboard(el);
        },
        // get
        /**
         * 这里的校验数据,应该以flow中的特点来设置不同的属性
         * 比如shape,需要与id结合在一起
         * @param  {[type]} data [description]
         * @return {[type]}      [description]
         */
        formData: function(data) {
            var _this = this;

            var sd = {},
                index = this.hasShape(data.shape);

            if (index == -1 && !_.isUndefined(data.shape)) {
                sd.sign = data.sign || '';
                sd.shape = data.shape;
                sd.lines = _this.getLinesFormData(data);
                sd.arr = {};
                sd.tpl = data.tpl;
                if (!_.isUndefined(data.sid)) {
                    sd.sid = data.sid;
                    sd.sign = data.sign;
                    sd.position = data.position;
                }
            } else {
                sd.index = index
            }

            return sd;
        },
        /**
         * 用于验证是否是一个正确的流程,包括有起点和终点,而且不是死路
         * 所以需要对每一条路径进行测算,验证能否走到终点
         * @return {[type]} [description]
         */
        verify: function() {
            var _this = this;

            var connections = this.jsplumb.line.getAllConnections(),
                start = $(".symbol_flow-start"),
                end = $(".symbol_flow-end"),
                flow = $(".symbol_flow");

            if (flow.length > 0) {
                if (start.length > 0 && end.length > 0) {
                    if (connections.length == 0) {
                        _this.debug("没有任何连线");
                    } else {
                        var arr = [],
                            start = '',
                            end = '';
                        $.each(flow, function(i, t) {
                            var item = $(t),
                                id = _this.getSubId($(t).attr("id"));
                            arr.push(id);
                            if (item.find(_this.options.selector.symbolStart).length > 0) {
                                start = id;
                            } else if (item.find(_this.options.selector.symbolEnd).length > 0) {
                                end = id;
                            }
                        });
                        _this.lineFull(arr, connections, start, end);
                    }
                } else if (start.length == 0) {
                    _this.debug("缺少起点");
                } else if (end.length == 0) {
                    _this.debug("缺少终点");
                }
            } else {
                _this.debug("没有任何流程");
            }
        },
        lineFull: function(arr, conns, start, end) {
            var _this = this;

            var max = _.max(arr);
            var g = new graph(max + 1);
            var lines = [];
            $.each(conns, function(i, t) {
                if (isNaN(_this.getSubId(t.sourceId))) {
                    t.sourceId = $("#" + t.sourceId).closest('.symbol_flow').attr("id");
                }
                if (isNaN(_this.getSubId(t.targetId))) {
                    t.targetId = $("#" + t.targetId).closest('.symbol_flow').attr("id");
                }
                lines.push({ from: _this.getSubId(t.sourceId), to: _this.getSubId(t.targetId) });
            });

            var legal = _.uniq(_.flatten(g.verify(lines, start, end))),
                ille = _.difference(arr, legal);

            if (legal.length == 0) {
                _this.showVerify(arr, start, end);
            } else if (ille.length > 0) {
                _.each(ille, function(item) {
                    var _legal = g.verify(item, end);
                    if (_legal.length > 0) {
                        _.each(_legal, function(v) {
                            if (_.every(v, function(items) {
                                    return items !== 1
                                })) {
                                legal.push(item);
                            }
                        });
                        legal = _.uniq(legal);
                    }
                });
            }

            var illegality = _.difference(arr, legal);

            if (illegality.length == 0) {
                _this.verifyes = true;
                _this.debug("连线合法")
            } else {
                _this.showVerify(illegality, start, end);
            }
        },
        showVerify: function(arr, start, end) {
            _.each(arr, function(item) {
                if (item !== start && item !== end) {
                    console.log("art_" + item + "无法完成流程!请检查连线");
                }
            });
        },
        /**
         * 根据命名规则,取art_之后的数字
         * @param  {[type]} str [description]
         * @return {[type]}     [description]
         */
        getSubId: function(str) {
            return Number(str.substring(4));
        },
        /**
         * 只能出现一个开始和一个结束
         * @param  {[type]}  shape [description]
         * @return {Boolean}       [description]
         */
        hasShape: function(shape) {
            var _this = this;

            var index = -1,
                start = 0,
                end = 0;
            $.each(this.symbols, function(i, t) {
                if (t.shape === "start") {
                    start++;
                }
                if (t.shape === "end") {
                    end++;
                }
            });
            if (shape == "start" && start == 0) {
                return index;
            } else if (shape == "end" && end == 0) {
                return index;
            } else if (shape != "start" && shape != "end") {
                return index;
            } else {
                return 1;
            }
        },
        /**
         * 验证并发体中的各项连线是否正确,其中:
         * 并发体与外部节点只能由外部节点到并发体的起点,如果从起点开始,则必定是起点到自身内部的连线
         * 并发体的终点,只能连到外部节点,只能接受自身内部节点;
         * 只计算其中一个点或者两个点是并发体的情况
         * @param  {[type]}  source [description]
         * @param  {[type]}  target [description]
         * @return {Boolean}        [description]
         */
        hasLineLegal: function(source, target) {
            var _this = this;

            var verify = false;

            var sourceSymbol = _this.getSymbol(source.hasClass('symbol_flow') ? source.attr("id") : source.closest('.symbol_flow').attr("id")),
                targetSymbol = _this.getSymbol(target.hasClass('symbol_flow') ? target.attr("id") : target.closest('.symbol_flow').attr("id"));

            if (source.hasClass('symbol_pivot-start') || source.hasClass('symbol_pivot-end') || target.hasClass('symbol_pivot-start') || target.hasClass('symbol_pivot-end')) {

                if (sourceSymbol.level === targetSymbol.level) {
                    if ((sourceSymbol.shape !== "concurrence" && !target.hasClass('symbol_pivot-end')) || (source.hasClass('symbol_pivot-end') && sourceSymbol.shape === "concurrence") || (source.hasClass('symbol_pivot-start') && target.hasClass('symbol_pivot-end'))) {
                        verify = true;
                    }
                } else if (sourceSymbol.level < targetSymbol.level) {
                    if (Number(targetSymbol.level) - Number(sourceSymbol.level) == 1) verify = true;
                } else if (sourceSymbol.level > targetSymbol.level) {
                    if (Number(sourceSymbol.level) - Number(targetSymbol.level) == 1 && target.hasClass('symbol_pivot-end') && !source.hasClass('symbol_pivot-start')) verify = true;
                }
            } else if (sourceSymbol.level === targetSymbol.level) {
                verify = true;
            }

            return verify;
        },
        getShape: function(el) {
            return el.attr("data-shape");
        },
        getShapeName: function(shape) {
            return shape == "start" ? "开始" : shape == "end" ? "结束" : shape == "route" ? "路由" : shape == "concurrence" ? "并发体" : "流程";
        },
        getSign: function(el) {
            return el.attr('data-sign');
        },
        getId: function(el) {
            return el.attr('id');
        },
        getLine: function(conId) {
            return this.lines[this.inArrayObj("conId", conId, this.lines)];
        },
        getSymbol: function(id) {
            return this.symbols[this.inArrayObj("id", id, this.symbols)];
        },
        getSymbolToSign: function(sign) {
            return this.symbols[this.inArrayObj("sign", sign, this.symbols)];
        },
        /**
         * 深复制symbols对象,便于外部访问
         * @return {[type]} [description]
         */
        getSymbols: function() {
            return $.extend(true, {}, this.symbols);
        },
        getIndex: function(id) {
            return this.inArrayObj("id", id, this.symbols);
        },
        getLineIndex: function(conId) {
            return this.inArrayObj("conId", conId, this.lines);
        },
        getLinesFormData: function(data) {
            return [];
        },
        // 处理数据集合
        getData: function() {
            var _this = this;

            if (!_this.verifyes) {
                _this.debug("请先校验");
                return false;
            }

            var data = {
                xml: _this.getDataXML()
            };

            return data;
        },
        getDataXML: function() {
            return this.renderTpl(flowXML, {
                nodes: this.symbols,
                lines: this.lines,
                config: this.config
            });
        },
        getNodeXml: function() {
            var _this = this;

            var start = {
                "id": "artboard",
                "shapeName": "artboard",
                "parentId": "0"
            };
            var data = new mt().init(start, this.symbols, "shapeName");
            return data.xml;
        },
        getLineXml: function() {
            return this.renderTpl(flowLineXML, { lines: this.lines });
        },
        getConfigXml: function() {
            return this.renderTpl(flowConfigXML, this.config);
        },
        getLineExist: function(id) {
            return this.inArrayObj("id", id, this.lines);
        },
        getSite: function(line) {
            var _this = this;

            var source = $("#" + line.from),
                target = $("#" + line.to),
                sourceSymbol = _this.getSymbol(line.from),
                targetSymbol = _this.getSymbol(line.to),
                sourceSite = "Continuous",
                targetSite = "Continuous";

            if (_.isEqual(line.from, line.to) && sourceSymbol.shape != "concurrence") {
                _this.jsplumb.allowLoopback(source.get(0));
                return {};
            }

            if (sourceSymbol.shape == "concurrence" && targetSymbol.shape == "concurrence") {
                sourceSite = "Center";
                targetSite = "Center";
                if (sourceSymbol.level > targetSymbol.level) {
                    source = source.find(".symbol_pivot-end");
                    target = target.find(".symbol_pivot-end");
                } else if (_.isEqual(line.from, line.to)) {
                    source = source.find(".symbol_pivot-start");
                    target = target.find(".symbol_pivot-end");
                } else {
                    source = source.find(".symbol_pivot-start");
                    target = target.find(".symbol_pivot-start");
                }
            } else {
                if (sourceSymbol.shape == "concurrence") {
                    sourceSite = "Center";
                    if (sourceSymbol.level == targetSymbol.level) {
                        source = source.find(".symbol_pivot-end");
                    } else {
                        source = source.find(".symbol_pivot-start");
                    }
                }
                if (targetSymbol.shape == "concurrence") {
                    targetSite = "Center";
                    if (sourceSymbol.level == targetSymbol.level) {
                        target = target.find(".symbol_pivot-start");
                    } else {
                        target = target.find(".symbol_pivot-end");
                    }
                }
            };
            return { source: source, target: target, anchors: [sourceSite, targetSite] }
        },
        // set
        setMinWH: function(obj) {
            var mw = 0,
                mh = 0,
                pMw = parseInt($("#" + obj.parentId).find(this.options.selector.symbolConcurrence).css("minWidth")),
                pMh = parseInt($("#" + obj.parentId).find(this.options.selector.symbolConcurrence).css("minHeight"));

            if (obj.shape == "concurrence") {
                mw = 200;
                mh = 100;
            } else {
                mw = 48;
                mh = 73;
            }

            $("#" + obj.parentId).find(this.options.selector.symbolConcurrence).css({
                "minWidth": (pMw - mw) + "px",
                "minHeight": (pMh - mh) + "px"
            })
        },
        position: function() {
            this.empty();

            $(this.options.selector.layout).scrollTop(980).scrollLeft(980);
        },
        /**
         * 重要方法,辨识连接线两端是否合法,且需要做相应的处理,外键必须关联到主键上
         * 需要检查是否与lines相关联,其中,lines是个二维数组,排序很重要
         * 在这里,lines不在是个二维数组了,因为需要与节点分开解析
         * @param {[type]} source [description]
         * @param {[type]} target [description]
         */
        setKeyToSymbol: function(source, target, connection) {
            var _this = this;

            var sourceSymbol = _this.getSymbol(source.hasClass('symbol_flow') ? source.attr("id") : source.closest('.symbol_flow').attr("id")),
                targetSymbol = _this.getSymbol(target.hasClass('symbol_flow') ? target.attr("id") : target.closest('.symbol_flow').attr("id")),
                fromSite = connection.sourceEndpoint.anchor.type,
                toSite = connection.targetEndpoint.anchor.type;

            if (_.isEqual(sourceSymbol.id, targetSymbol.id) && _.some(this.lines, function(item) {
                    return sourceSymbol.id === item.from && item.from === item.to;
                })) {
                connection.connection.setData({ "type": "line1" });
                _this.jsplumb.line.detach(connection);
                _this.debug("已经有闭环线条了");
                return false;
            } else if (_.isEqual(sourceSymbol.id, targetSymbol.id) && (fromSite === "Continuous" || toSite === "Continuous")) {
                connection.connection.setData({ "type": "line1" });
                _this.jsplumb.line.detach(connection);
                _this.jsplumb.allowLoopback(source);
                _this.debug("需要重新连接");
                return false;
            }

            var line = {
                from: source.closest(".symbol_flow").attr("id"),
                to: target.closest(".symbol_flow").attr("id"),
                displayName: "",
                labelId: "",
                conId: connection.connection.id,
                conn: connection
            };

            // 第一种:单纯连线的情况,包括删除的连线,也很独立
            var line1 = connection.connection.getParameter("line1");
            // 第二种:dashboard连线的情况
            var line2 = connection.connection.getParameter("line2");
            // 第三种:批量更新连线的情况
            var line3 = connection.connection.getParameter("line3");

            if (!_.isUndefined(line1)) {
                line.displayName = line1.displayName;
                _this.lines.push(line);
            } else if (!_.isUndefined(line2)) {
                _this.lines.push(line);
            } else if (!_.isUndefined(line3)) {
                line.displayName = line3.displayname;
                _this.lines.push(line);
            } else {
                _this.lines.push(line);
                _this.mutation.addServe(_.bind(_.partial(_this.undoLine, line), _this), _.bind(_.partial(_this.redoLine, line), _this));
            }

            // 每次的单纯连线记录
            this.verifyes = false;
            this.bindLineContextMenu(connection);
            this.jsplumb.line.repaintEverything();
        },

        // undo and redo
        /**
         * 作为撤销操作,对于symbol而言,就是删除更新的节点和数据
         * 作为重做操作,对于symbol而言,就是将被删除的节点和数据还原
         * @param  {[type]} obj [description]
         * @return {[type]}     [description]
         */
        undoSymbol: function(obj) {
            var index = this.getIndex(obj.id);

            this.symbols.splice(index, 1);
            this.jsplumb.line.remove($("#" + obj.id).get(0));
        },
        redoSymbol: function(obj) {
            var _this = this;

            this.symbols.push(obj);

            this.renderSymbol(obj.tpl, obj.position, obj.id, 1, function(el) {
                console.log(el);
            });
        },
        /**
         * 对于生成的dashboard而言,撤销比较容易,于symbol类似,删除节点加连线的数据
         * 但生成dashboard,需要连连线也一起算入重做,需要动态修改连线的值
         * @return {[type]} [description]
         */
        undoSymbolInDashboard: function(obj, source, adaption) {
            var index = this.getIndex(obj.id);

            this.symbols.splice(index, 1);
            this.jsplumb.line.remove($("#" + obj.id).get(0));

            this.lines = _.filter(this.lines, function(item) {
                return item.from != obj.id && item.to != obj.id;
            });

            if (adaption) this.setMinWH(obj);
        },
        redoSymbolInDashboard: function(obj, source) {
            var _this = this;

            this.symbols.push(obj);
            if (Number(obj.level) > 1) {
                var parent = _this.getSymbol(obj.parentId);
                _this.renderConcurrenceInSymbol(obj.tpl, obj.position, obj.id, obj.parentId, Number(parent.level) + 1, function(el) {
                    _this.jsplumb.connectSymbolInDashboard(_this.dashboardSource, el);
                });
            } else {
                this.renderSymbol(obj.tpl, obj.position, obj.id, 1, function(el) {
                    _this.jsplumb.connectSymbolInDashboard(source, el);
                });
            }
        },
        /**
         * 对于拖动的撤销,也需要考虑到线的刷新
         * @param  {[type]} index    [description]
         * @param  {[type]} position [description]
         * @return {[type]}          [description]
         */
        undoSymbolToMove: function(index, position) {
            this.symbols[index].position = position;

            $("#" + this.symbols[index].id).css({
                "left": position.left,
                "top": position.top
            });

            this.jsplumb.line.repaintEverything();
        },
        redoSymbolToMove: function(index, position) {
            this.symbols[index].position = position;

            $("#" + this.symbols[index].id).css({
                "left": position.left,
                "top": position.top
            });

            this.jsplumb.line.repaintEverything();
        },
        /**
         * 变换大小时,也需要加入撤销和重做
         * 同样,需要在完成之后刷新
         * 需要与之前做比对,否则width和height无法还原,如果之前没有,则为auto;
         * @param  {[type]} index    [description]
         * @param  {[type]} position [description]
         * @return {[type]}          [description]
         */
        undoResize: function(index, position, afterPosition) {
            this.symbols[index].position = position;

            $("#" + this.symbols[index].id).css({
                "left": afterPosition.left,
                "top": afterPosition.top,
                "width": afterPosition.width ? afterPosition.width + "px" : "auto",
                "height": afterPosition.height ? afterPosition.height + "px" : "auto"
            });
            $(".active-line").removeClass('active-line');
            this.activeLine = null;
            $(".active-endpoint").removeClass('active-endpoint');
            $(".symbol_flow.active").removeClass('active');
            this.resize.hide();
            this.jsplumb.line.repaintEverything();
        },
        redoResize: function(index, position, afterPosition) {
            this.symbols[index].position = position;

            $("#" + this.symbols[index].id).css({
                "left": afterPosition.left,
                "top": afterPosition.top,
                "width": afterPosition.width ? afterPosition.width + "px" : auto,
                "height": afterPosition.height ? afterPosition.height + "px" : auto
            });
            $(".active-line").removeClass('active-line');
            this.activeLine = null;
            $(".active-endpoint").removeClass('active-endpoint');
            $(".symbol_flow.active").removeClass('active');
            this.resize.hide();
            this.jsplumb.line.repaintEverything();
        },
        /**
         * [undoConcurrenceInSymbol description]
         * 对于并发体中的流程,最重要的是在撤销时控制好自适应大小函数
         * 还有删除父节点中相应的item数据
         * @return {[type]} [description]
         */
        undoConcurrenceInSymbol: function(obj, adaption) {
            var index = this.getIndex(obj.id);

            var parent = this.getSymbol(obj.parentId),
                itemIndex = this.inArrayObj("child", obj.id, parent.items);

            this.symbols[this.getIndex(obj.parentId)].items.splice(itemIndex, 1);
            this.symbols.splice(index, 1);
            this.jsplumb.line.remove($("#" + obj.id).get(0));

            if (adaption) this.setMinWH(obj);
        },
        redoConcurrenceInSymbol: function(obj, adaption) {
            var _this = this;

            var parent = _this.getSymbol(obj.parentId);

            this.symbols.push(obj);
            this.symbols[this.getIndex(obj.parentId)].items.push({ child: obj.id });

            _this.renderConcurrenceInSymbol(obj.tpl, obj.position, obj.id, obj.parentId, Number(parent.level) + 1, function(el, adaption) {
                console.log(el);
            });
        },
        /**
         * 对于线的撤销和重做,只要传入source和target就可以,还需要obj的唯一标识
         * 但需要注意自连和并发体上的连接,要以数据的变化来相应的更新连线
         * 数据需要在重做时先加入内部数据库中,再通过检测判断是否已经有数据而跳过多个函数的限制
         * 删除时当做栈处理
         * @return {[type]} [description]
         */
        undoLine: function(obj) {
            var line = this.lines.pop();

            obj.conn.connection.setData({ "type": "line1" });
            line.conn.connection.setData({ "type": "line1" });

            if (_.isNull(obj.conn.connection.connector)) {
                this.jsplumb.line.detach(line.conn);
            } else {
                this.jsplumb.line.detach(obj.conn)
            }
        },
        redoLine: function(obj) {
            var config = this.getSite(obj);
            config.parameters = {
                "line1": obj
            };
            if (!_.isEmpty(config)) this.jsplumb.connect(config);
        },
        /**
         * 对于删除的delete而言,撤销是重新划线,
         * 重做是删除栈的最后一个中的conn
         * 这里的type是第四种
         * @return {[type]} [description]
         */
        undoDeleteLine: function(obj) {
            var config = this.getSite(obj);
            config.parameters = {
                "line1": obj
            };
            if (!_.isEmpty(config)) this.jsplumb.connect(config);
        },
        redoDeleteLine: function(obj) {
            var line = this.lines.pop();

            obj.conn.connection.setData({ "type": "line4" });
            line.conn.connection.setData({ "type": "line4" });

            if (_.isNull(obj.conn.connection.connector)) {
                this.jsplumb.line.detach(line.conn);
            } else {
                this.jsplumb.line.detach(obj.conn);
            }
        },
        /**
         * 作为批量数据的撤销和重做来说,
         * 重做只需要把数据和节点删除,
         * 而撤销,则意味着需要使用load方法,来批量载入数据
         * 首先要将所有节点和连线汇总起来
         * 删除并发体时需要
         * @return {[type]} [description]
         */
        undoBatch: function(data) {
            var _this = this;

            var _data = {
                symbols: [],
                lines: []
            }

            $.each(data, function(i, t) {
                $.each(t.symbols, function() {
                    _data.symbols.push(this)
                });
                $.each(t.lines, function() {
                    _data.lines.push(this)
                })
            });

            this.batch = true; // 批量操作时,改为true
            var batchFlow = new middleWare();
            batchFlow.use(_.bind(_this.batchSymbol, _this)).use(_.bind(_this.batchLine, _this));
            batchFlow.handleRequest(_data);
        },
        redoBatch: function(data) {
            var _this = this;
            var _data = [];

            $.each(data, function(i, t) {
                _this.deleteSymbol(t.symbols[0].id);
                _this.batchDelete = true;
            });

            $.each(data, function(i, t) {
                var symbols = t.symbols;

                for (var j = symbols.length - 1; j >= 0; j--) {
                    _this.jsplumb.line.remove($("#" + symbols[j].id).get(0));
                }
            });

            this.verifyes = false;
        },
        batchSymbol: function(data, next) {
            var _this = this,
                _symbols = new symbols();

            var maxSymbol = _.max(data.symbols, function(symbol) {
                return Number(symbol.level);
            });

            for (var i = 1; i <= Number(maxSymbol.level); i++) {
                for (var j = 0; j < data.symbols.length; j++) {
                    var node = data.symbols[j];
                    if (i == Number(node.level)) {
                        if (Number(node.level) == 1) {
                            _this.update("add symbol", _this.initSymbol({
                                shape: node.shape,
                                tpl: node.tpl,
                                shapeName: node.shapeName,
                                sign: node.sign,
                                sid: node.id,
                                position: node.position
                            }));
                        } else {
                            _this.update("add concurrence in symbol", _this.initSymbol({
                                shape: node.shape,
                                tpl: node.tpl,
                                shapeName: node.shapeName,
                                sign: node.sign,
                                sid: node.id,
                                position: node.position
                            }, {}, node.parentId));
                        }
                    }
                }
            }

            next();
        },
        batchLine: function(data) {
            var _this = this;

            for (var i = 0; i < data.lines.length; i++) {
                var line = data.lines[i];
                var config = _this.getSite(line);
                config.parameters = {
                    "line3": line
                };
                if (!_.isEmpty(config)) _this.jsplumb.connect(config);
            }
        },
        /**
         * 新增一个symbol,这里的层级都是第二级,也就是1;0为root根节点
         * @param {[type]} obj [description]
         */
        addSymbol: function(obj) {
            var _this = this;

            if (_.isUndefined(obj.index)) {
                var _id = _.isUndefined(obj.sid) ? _this.sid : obj.sid;
                var zIndex = 999 + Number(_id.replace(/[^0-9]/ig, ""));

                var _obj = {
                    id: _id, // 内部标识id
                    sign: obj.sign || '',
                    shape: obj.shape,
                    shapeName: obj.shapeName,
                    arr: obj.arr, // 缓存原始数据
                    position: obj.position, // 内部使用位置信息
                    lines: obj.lines || [], // 内部line信息
                    items: [],
                    parentId: "artboard",
                    level: 1,
                    zIndex: zIndex,
                    tpl: obj.tpl
                };

                _this.symbols.push(_obj);
                _this.debug(_this.symbols)

                _this.renderSymbol(_obj.tpl, _obj.position, _obj.id, 1, function(el) {
                    if (_this.batch) {
                        if (!_.isUndefined(obj.parentId)) _this.jsplumb.connectSymbolInDashboard(_this.dashboardSource, el);
                    } else {
                        if (!_.isUndefined(obj.parentId)) {
                            _this.jsplumb.connectSymbolInDashboard(_this.dashboardSource, el);

                            _this.mutation.addServe(_.bind(_.partial(_this.undoSymbolInDashboard, _obj, _this.dashboardSource), _this), _.bind(_.partial(_this.redoSymbolInDashboard, _obj, _this.dashboardSource), _this));
                        } else {
                            _this.mutation.addServe(_.bind(_.partial(_this.undoSymbol, _obj), _this), _.bind(_.partial(_this.redoSymbol, _obj), _this));
                        }

                        _this.batch = false; // 当有独立的symbol插入时,取消batch的状态
                    }
                });
                //_this.appendToLines(obj.lines);
            } else {
                _this.debug("已存在开始或者结束节点");
            }
        },
        /**
         * 将并发体增加到元件当中去,这里暂时使用一维数组,设置子父结构还有层级属性,来构建数据
         */
        addConcurrenceInSymbol: function(obj) {
            var _this = this;

            if (obj.shape == "start") {
                _this.debug("并发体中不能放置开始节点");
            } else if (obj.shape == "end") {
                _this.debug("并发体中不能放置结束节点");
            } else if (_.isUndefined(obj.index)) {
                var parent = _this.getSymbol(obj.parentId),
                    parentIndex = _this.getIndex(obj.parentId),
                    _id = _.isUndefined(obj.sid) ? _this.sid : obj.sid,
                    zIndex = Number(parent.zIndex) + 10;

                var _obj = {
                    id: _id, // 内部标识id
                    sign: obj.sign || '',
                    shape: obj.shape,
                    shapeName: obj.shapeName,
                    arr: obj.arr, // 缓存原始数据
                    position: obj.position, // 内部使用位置信息
                    lines: obj.lines || [], // 内部line信息
                    items: [],
                    parentId: parent.id,
                    level: Number(parent.level) + 1,
                    zIndex: zIndex,
                    tpl: obj.tpl
                };

                _this.symbols.push(_obj);

                _this.symbols[parentIndex].items.push({
                    child: _id
                });

                _this.debug(_this.symbols);

                _this.renderConcurrenceInSymbol(obj.tpl, obj.position, _id, obj.parentId, Number(parent.level) + 1, function(el, adaption) {
                    if (_this.batch) {
                        if (!_.isUndefined(obj.parentSymbol)) _this.jsplumb.connectSymbolInDashboard(_this.dashboardSource, el);
                    } else {
                        if (!_.isUndefined(obj.parentSymbol)) {
                            _this.jsplumb.connectSymbolInDashboard(_this.dashboardSource, el);

                            _this.mutation.addServe(_.bind(_.partial(_this.undoSymbolInDashboard, _obj, _this.dashboardSource, adaption), _this), _.bind(_.partial(_this.redoSymbolInDashboard, _obj, _this.dashboardSource), _this));
                        } else {
                            _this.mutation.addServe(_.bind(_.partial(_this.undoConcurrenceInSymbol, _obj, adaption), _this), _.bind(_.partial(_this.redoConcurrenceInSymbol, _obj, adaption), _this));
                        }
                    }

                });
                //_this.appendToLines(obj.lines);
            } else {
                _this.debug("已存在开始或者结束节点");
            }
        },
        /**
         * 用于解决通过快捷方式进行添加symbol
         * @param {[type]} obj [description]
         */
        addSymbolInTool: function(obj) {
            var _this = this;

            if (_.isUndefined(obj.index)) {
                if (_.isObject(obj.parentSymbol)) {
                    obj.parentId = obj.parentSymbol.id;
                    obj.position.left = obj.position.left - obj.parentSymbol.position.left;
                    obj.position.top = obj.position.top - obj.parentSymbol.position.top;

                    //_this.selfAdaption($("#" + obj.parentId), obj.shape, true);
                    _this.update("add concurrence in symbol", obj)
                } else {
                    _this.update("add symbol", obj);
                }
            } else {
                _this.debug("已存在开始或者结束节点");
            }
        },
        /**
         * 初始化symbol内部使用数据
         * @return {[type]} [description]
         */
        initSymbol: function(data, ui, target) {
            var sd = this.formData(data);

            sd.position = !_.isUndefined(sd.position) ? sd.position : ui.position;
            sd.shapeName = !_.isUndefined(sd.shapeName) ? sd.shapeName : this.getShapeName(sd.shape);

            if (!_.isUndefined(target)) {
                if (target instanceof jQuery) {
                    sd.parentId = target.attr("id");
                } else if (_.isObject(target)) {
                    sd.parentSymbol = target;
                } else {
                    sd.parentId = target;
                    sd.adaption = true; // 是否自动校准尺寸
                }
            }

            return sd;
        },
        initUniqueId: function(id) {
            for (var i = 1; i <= id; i++) {
                this.sid = _.uniqueId("art_");
            }
        },
        // load
        loadNode: function(data, next) {
            var _this = this,
                _symbols = new symbols();

            var maxSymbol = _.max(data.nodes.node, function(node) {
                return Number(node.level);
            });

            var maxId = _.max(data.nodes.node, function(node) {
                return _this.getSubId(node.id);
            });

            _this.initUniqueId(_this.getSubId(maxId.id));

            for (var i = 1; i <= Number(maxSymbol.level); i++) {
                for (var j = 0; j < data.nodes.node.length; j++) {
                    var node = data.nodes.node[j];
                    node.type == "activity" ? node.type = "adjust" : '';
                    if (i == Number(node.level)) {
                        if (Number(node.level) == 1) {
                            _this.update("add symbol", _this.initSymbol({
                                shape: node.type,
                                tpl: _symbols.setShape(node.type),
                                shapeName: node.displayname,
                                sign: node.name,
                                sid: node.id,
                                position: { left: Number(node["_x"]), top: Number(node["_y"]), width: Number(node["_width"]), height: Number(node["_height"]) }
                            }));
                        } else {
                            _this.update("add concurrence in symbol", _this.initSymbol({
                                shape: node.type,
                                tpl: _symbols.setShape(node.type),
                                shapeName: node.displayname,
                                sign: node.name,
                                sid: node.id,
                                position: { left: Number(node["_x"]), top: Number(node["_y"]), width: Number(node["_width"]), height: Number(node["_height"]) }
                            }, {}, node.concurrenceid));
                        }
                    }
                }
            }

            next();

        },
        /**
         * 为载入的数组创建连线
         * @param  {[type]}   data [description]
         * @param  {Function} next [description]
         * @return {[type]}        [description]
         */
        loadLine: function(data, next) {
            var _this = this;

            for (var i = 0; i < data.lines.line.length; i++) {
                var line = data.lines.line[i];
                var config = _this.getSite(line);
                config.parameters = {
                    "line3": line
                };
                if (!_.isEmpty(config)) _this.jsplumb.connect(config);
            }

            next();
        },
        loadConfig: function(data) {
            console.log(data, this.symbols, this.lines);
        },
        // create
        createSymbol: function(ui) {
            var _this = this,
                _symbols = new symbols();

            var shape = this.getShape(ui.draggable);
            _this.update("add symbol", _this.initSymbol({
                shape: shape,
                tpl: _symbols.setShape(shape)
            }, ui));
        },
        /**
         * 处理载入流程图数据
         * 需要处理节点是否是并发体内部的节点的情况
         * 只有第一层的节点不需要特殊处理
         * @param  {[type]} data [description]
         * @return {[type]}      [description]
         */
        createSymbols: function(data) {
            var _this = this,
                _symbols = new symbols();

            this.batch = true; // 批量操作时,改为true
            var loadFlow = new middleWare();
            loadFlow.use(_.bind(this.loadNode, this)).use(_.bind(this.loadLine, this)).use(_.bind(this.loadConfig, this));
            loadFlow.handleRequest(data);
        },
        /**
         * 并发体的流程
         * @param  {[type]} ui [description]
         * @return {[type]}    [description]
         */
        createConcurrenceInSymbol: function(target, ui) {
            var _this = this,
                _symbols = new symbols();

            var shape = this.getShape(ui.draggable);
            _this.update("add concurrence in symbol", _this.initSymbol({
                shape: shape,
                tpl: _symbols.setShape(shape),
            }, ui, target));
        },
        /**
         * 根据快捷菜单,自动生成对应的symbol
         * @return {[type]} [description]
         */
        createSymbolInTool: function(shape, position, parentSymbol) {
            var _this = this,
                _symbols = new symbols();

            _this.update("add symbol in tool", _this.initSymbol({
                shape: shape,
                tpl: _symbols.setShape(shape)
            }, { position: position }, parentSymbol))
        },
        updateConfig: function(el) {
            var _this = this;

            var sd = this.serializeJSON(el.serializeArray(), el);

            $.extend(true, this.config, sd);

            _this.flowConfigModal.modal.modal('toggle');
        },
        updateFlow: function(el) {
            var _this = this;

            var sid = el.attr("data-sid"),
                sd = this.serializeJSON(el.serializeArray(), el),
                index = _this.getIndex(sid);

            $.extend(true, this.symbols[index], sd);
            this.renderFlowUpdate(sid, sd);
        },
        updateFlowInPos: function(data) {
            var _this = this;

            var pos = { left: data.pos[0], top: data.pos[1] };
            var afterPos = this.symbols[data.index].position;

            this.symbols[data.index].position = pos;

            _this.mutation.addServe(_.bind(_.partial(_this.undoSymbolToMove, data.index, afterPos), _this), _.bind(_.partial(_this.redoSymbolToMove, data.index, pos), _this));
        },
        /**
         * 根据当时的el参数,动态的修改数据
         * @param  {[type]} el [description]
         * @return {[type]}    [description]
         */
        updateFlowInResize: function(el) {
            var _this = this;

            var index = this.getIndex(this.getId(el));

            var pos = {
                left: el.position().left,
                top: el.position().top,
                width: parseInt(el.css("width")),
                height: parseInt(el.css("height"))
            };
            var afterPos = this.symbols[index].position;

            this.symbols[index].position = pos;

            _this.mutation.addServe(_.bind(_.partial(_this.undoResize, index, pos, afterPos), _this), _.bind(_.partial(_this.redoResize, index, afterPos, pos), _this));
        },
        updateLine: function(el) {
            var _this = this;

            var conId = el.attr("data-conid"),
                sd = this.serializeJSON(el.serializeArray(), el),
                index = _this.getLineIndex(conId);

            $.extend(true, this.lines[index], sd);
            this.renderLineUpdate(this.lines[index]);
        },
        /**
         * 删除symbol,节点与数据都要更新
         * 加入撤销和重做之后,结构需要变化
         * @param  {[type]} el [description]
         * @return {[type]}    [description]
         */
        deleteSymbols: function(el) {
            var _this = this;

            var data = [];

            $.each(el, function(i, t) {
                data.push(_this.deleteSymbol(_this.getId($(t))));
                _this.batchDelete = true;
            });

            $.each(data, function(i, t) {
                var symbols = t.symbols;

                for (var j = symbols.length - 1; j >= 0; j--) {
                    _this.jsplumb.line.remove($("#" + symbols[j].id).get(0));
                }
            });

            this.verifyes = false;
            this.debug(this.lines, this.symbols, data);

            this.mutation.addServe(_.bind(_.partial(this.undoBatch, data), this), _.bind(_.partial(this.redoBatch, data), this));
        },
        /**
         * 只作为处理函数来使用
         * @param  {[type]} id   [description]
         * @param  {[type]} arr1 [description]
         * @param  {[type]} arr2 [description]
         * @return {[type]}      [description]
         */
        deleteSymbol: function(id, arr1, arr2) {
            var _this = this;

            var _id = id,
                symbol = this.getSymbol(_id),
                index = this.getIndex(_id),
                symbols = _.isUndefined(arr1) ? [] : arr1,
                lines = _.isUndefined(arr2) ? [] : arr2;
            // 内部缓存数据

            if ($("#" + id).find(_this.options.selector.symbolConcurrence).length > 0) _this.resize.hide();

            $.each(this.lines, function(i, t) {
                if (t.from == _id || t.to == _id) {
                    lines.push(t);
                }
            });

            this.lines = _.filter(this.lines, function(line) {
                return line.from != _id && line.to != _id;
            });

            var _symbol = this.symbols.splice(index, 1);
            symbols.push(_symbol[0]);

            for (var i = 0; i < symbol.items.length; i++) {
                var _item = symbol.items[i];
                _this.deleteSymbol(_item.child, symbols, lines);
            }

            return {
                symbols: symbols,
                lines: lines
            };
        },
        /**
         * 删除连线
         * 撤销和重做,需要把连线还原和继续删除,所以每次删除之后,如果重做,
         * 则删除的仍然是栈的最后一条数据
         * @param  {[type]} conn [description]
         * @return {[type]}      [description]
         */
        deleteLine: function(conn) {
            var _this = this;

            var line = this.lines.splice(this.inArrayObj("conId", conn.id, this.lines), 1);

            conn.setData({ "type": "line1" });
            _this.jsplumb.line.detach(conn);

            _this.mutation.addServe(_.bind(_.partial(_this.undoDeleteLine, line[0]), _this), _.bind(_.partial(_this.redoDeleteLine, line[0]), _this));

            this.verifyes = false;
        },
        deleteLineToMove: function(conn) {
            var _this = this;

            var line = this.lines.splice(this.inArrayObj("conId", conn.connection.id, this.lines), 1);

            _this.mutation.addServe(_.bind(_.partial(_this.undoDeleteLine, line[0]), _this), _.bind(_.partial(_this.redoDeleteLine, line[0]), _this));
            this.verifyes = false;
        },
        /**
         * 需要自动处理并发体内部大小
         * 如果内容的大小会超过并发体的大小,则应当自动增加大小
         * @param  {[type]} target [description]
         * @param  {[type]} el     [description]
         * @return {[type]}        [description]
         */
        selfAdaption: function(target, el, auto) {
            var _this = this;

            var node = target.find(".symbol_flow");
            var contentSize = target.outerWidth() * target.outerHeight(),
                nodeSize = 0,
                scale = 0;
            $.each(node, function(i, t) {
                nodeSize += $(t).outerWidth() * $(t).outerHeight();
            });

            var adaption = false;

            if (el == "concurrence" || (_.isObject(el) && el.attr("data-shape") == "concurrence") || (el instanceof jQuery && el.find(_this.options.selector.symbolConcurrence).length > 0)) {
                nodeSize += 200 * 100;
                scale = nodeSize / contentSize;

                if (scale >= 0.7) {
                    var _w = target.width() + 200,
                        _ow = target.outerWidth() + 200,
                        _h = target.height() + 100,
                        _oh = target.outerHeight() + 100;
                    target.css("minWidth", _ow);
                    target.css("minHeight", _oh);
                    adaption = true;
                }
            } else {
                nodeSize += 48 * 73;
                scale = nodeSize / contentSize;

                if (scale >= 0.7) {
                    var _w = target.width() + 48,
                        _ow = target.outerWidth() + 48,
                        _h = target.height() + 73,
                        _oh = target.outerHeight() + 73;
                    target.css("minWidth", _ow);
                    target.css("minHeight", _oh);
                    adaption = true;
                }
            }

            return adaption;
        },
        // event
        event: function() {
            this.drop();
            this.bindClick();
            this.bindKeyDown();
            this.bindConnect();
            this.bindSave();
            this.contextMenu();
        },
        bindClick: function() {
            var _this = this;

            $("#config").click(function() {
                _this.flowConfigModal = new modal("flow-config", {});
            });

            $(this.el).on("click", function(event) {
                if (event.target == this) {
                    $(".active-line").removeClass('active-line');
                    _this.activeLine = null;
                    $(".active-endpoint").removeClass('active-endpoint');
                    $(".symbol_flow.active").removeClass('active');
                    _this.resize.hide();
                }
            }).on("click", ".symbol_flow", function(e) {
                $(".active-line").removeClass('active-line');
                _this.activeLine = null
                if (!$(this).hasClass("active")) {
                    $(".active-endpoint").removeClass('active-endpoint');
                    $(".symbol_flow.active").removeClass('active');
                    if ($(this).hasClass("symbol_flow-sec")) {
                        _this.jsplumb.line.selectEndpoints({ element: $(this).find(".symbol_pivot-start").get(0) }).addClass("active-endpoint");
                        _this.jsplumb.line.selectEndpoints({ element: $(this).find(".symbol_pivot-end").get(0) }).addClass("active-endpoint");
                        _this.resize.position($(this));
                    } else {
                        _this.jsplumb.line.selectEndpoints({ element: this }).addClass("active-endpoint");
                    }
                    $(this).addClass("active")
                }
                return false
            }).on("dblclick", ".symbol_flow", function(e) {
                _this.symbolEdit($(this));
            })

            this.jsplumb.line.bind("click", function(conn, event) {
                $(".active-line").removeClass('active-line');
                $(".active-endpoint").removeClass('active-endpoint');
                $(".symbol_flow.active").removeClass('active');
                conn.addClass('active-line');
                _this.activeLine = conn;
            });

            this.jsplumb.line.bind("dblclick", function(conn, event) {
                _this.symbolEdit(conn);
            });
        },
        bindConnect: function() {
            var _this = this;

            this.jsplumb.line.bind("connection", function(info) {
                var source = $(info.source),
                    target = $(info.target);

                if (source.hasClass('active') || source.closest(".symbol_flow").hasClass('active')) {
                    _this.jsplumb.line.selectEndpoints({ element: info.source }).addClass("active-endpoint");
                }

                if (target.hasClass("dashboard")) {
                    return false;
                } else if (!_this.hasLineLegal(source, target)) {
                    info.connection.setData({ "type": "line1" });
                    _this.jsplumb.line.detach(info);
                    return false;
                }

                _this.setKeyToSymbol(source, target, info);
            });

            this.jsplumb.line.bind("connectionDrag", function(info) {
                //console.log(info);
            });

            this.jsplumb.line.bind("connectionDetached", function(info) {
                var data = info.connection.getData();

                if (_this.batchDelete) {
                    _this.batchDelete = false;
                } else {
                    if (_.isEmpty(data)) {
                        _this.update("delete line to move", info)
                    } else if (data.type == "line1") {
                        console.log("line1");
                    } else if (data.type == "line4") {
                        console.log("line4");
                    }
                }
            });

            this.jsplumb.line.bind("connectionAborted", function(info, event) {
                _this.renderDashboard(info, event);
            })
        },
        drop: function() {
            var _this = this;
            $(this.el).droppable({
                scope: "axis",
                tolerance: "intersect",
                drop: function(event, ui) {
                    _this.sid = _.uniqueId('art_');
                    _this.createSymbol(ui);
                }
            });
        },
        dropConcurrence: function(el) {
            var _this = this;

            el.droppable({
                scope: "axis",
                greedy: true,
                tolerance: "intersect",
                hoverClass: "symbol_concurrence-hover",
                drop: function(event, ui) {
                    var offset = el.parents(".symbol_flow").offset();
                    ui.position.top = ui.offset.top - offset.top;
                    ui.position.left = ui.offset.left - offset.left;

                    _this.sid = _.uniqueId('art_');
                    _this.createConcurrenceInSymbol($(event.target).parent('.symbol_flow'), ui);
                }
            });
        },
        contextMenu: function() {
            var _this = this;

            $(this.options.selector.artboard).contextmenu({
                target: _this.options.selector.artboardMenu,
                before: function() {
                    $(_this.options.selector.boxMenu).removeClass('open');
                },
                onItem: function(context, e) {
                    var type = $(e.currentTarget).find('.menu-type').text();
                    _this.contextMenuType(type, $(_this.options.selector.artboard));
                }
            });
        },
        /**
         * dashboard失焦之后,需要删除节点
         * @return {[type]} [description]
         */
        blurDashboard: function(el) {
            var _this = this;

            var start = el.position().left,
                end = el.position().top,
                arr = [];

            $.each(this.symbols, function(i, t) {
                var artboard = $(_this.options.selector.artboard),
                    symbol = $("#" + t.id),
                    artboardSize = artboard.offset(),
                    left = symbol.offset().left - artboardSize.left,
                    top = symbol.offset().top - artboardSize.top;
                var x = [left, left + Number(symbol.outerWidth())],
                    y = [top, top + Number(symbol.outerHeight())];
                if (x[0] < start && x[1] > start && y[0] < end && y[1] > end) {
                    arr.push(t);
                }
            });

            var parentSymbol = arr.length == 0 ? "artboard" : _.max(arr, function(item) {
                return Number(item.level)
            });

            el.trigger("focus");
            el.blur(function() {
                _this.jsplumb.line.remove(el.get(0));
            }).on("click", "[data-shape]", function() {
                var shape = $(this).attr("data-shape");

                _this.sid = _.uniqueId('art_');
                _this.createSymbolInTool(shape, el.position(), parentSymbol);
                _this.jsplumb.line.remove(el.get(0));
            });
        },
        /**
         * 暂时只设置一个类型的右键菜单
         * @param  {[type]} el   [description]
         * @param  {[type]} type [description]
         * @return {[type]}      [description]
         */
        bindContextMenu: function(el) {
            var _this = this;

            el.contextmenu({
                target: _this.options.selector.symbolMenu,
                before: function() {
                    $(_this.options.selector.artboardMenu).removeClass('open');
                },
                onItem: function(context, e) {
                    var type = $(e.currentTarget).find('.menu-type').text();
                    _this.contextMenuType(type, el);
                    this.closemenu();
                }
            });
        },
        bindLineContextMenu: function(conn) {
            var _this = this;

            var arr = [];
            arr.push($(conn.connection.canvas));

            $.each(arr, function() {
                this.contextmenu({
                    target: _this.options.selector.lineMenu,
                    before: function() {
                        $(_this.options.selector.artboardMenu).removeClass('open');
                    },
                    onItem: function(context, e) {
                        var type = $(e.currentTarget).find('.menu-type').text();
                        _this.contextMenuType(type, conn);
                        this.closemenu();
                    }
                });
            });
        },
        bindSave: function() {
            var _this = this;

            $(this.options.selector.updateFlow).on("click", function() {
                _this.update("update flow", $("#flowChart").find(".modal-body form"));

            });

            $(this.options.selector.updateLine).on("click", function() {
                _this.update("update line", $("#flowLine").find(".modal-body form"));
            });

            $(this.options.selector.updateConfig).on("click", function() {
                _this.update("update config", $("#flowConfig").find(".modal-body form"));
            })

        },
        /**
         * 根据选择的菜单属性,进行相应的操作
         */
        contextMenuType: function(type, el) {
            var _this = this;

            switch (type) {
                case "新建":
                    break;
                case "剪切":
                    break;
                case "复制":
                    break;
                case "粘贴":
                    break;
                case "编辑":
                    _this.symbolEdit(el);
                    break;
                case "删除":
                    _this.symbolDelete(el);
                    break;
                case "全选":
                    _this.allSelected();
                    break;
                case "创建连线":
                    _this.lined();
                    break;
                case "置于顶层":
                    _this.bringToFront(el);
                    break;
                case "置于底层":
                    _this.sendToBack(el);
            }
        },
        bindKeyDown: function() {
            var _this = this;

            $(document).keydown(function(event) {
                switch (event.keyCode) {
                    case 8:
                        if ($(".symbol_flow.active").length > 0) {
                            _this.symbolDelete($(".symbol_flow.active"));
                        } else if ($(".active-line").length > 0 || _this.activeLine != null) {
                            _this.symbolDelete(_this.activeLine);
                            _this.activeLine = null;
                        }
                        break;
                }

                if (event.ctrlKey && event.which == 65) {
                    _this.allSelected();
                }
            });
        },
        symbolEdit: function(el) {
            var _this = this;

            if (el instanceof jQuery) {
                _this.flowElementModal = new modal("flow-element", _this.getSymbol(_this.getId(el)));
            } else {
                _this.flowLineModal = new modal("flow-line", _this.getLine(_.isUndefined(el.id) ? el.connection.id : el.id));
            }
        },
        symbolDelete: function(el) {
            var _this = this;

            if (el instanceof jQuery) {
                _this.update("delete symbols", el);
            } else {
                _this.update("delete line", el);
            }
        },
        lined: function() {
            var _this = this;

            if ($(_this.options.selector.boxShade).length == 0) {
                $(_this.options.tool.lineShow).removeClass('active');
                return false;
            }
            $(_this.options.selector.layout).addClass('layout-line');
            $(_this.options.tool.lineShow).addClass('active');
            $(_this.options.selector.boxShade).addClass('symbol_shade-hide');
        },
        allSelected: function() {
            var _this = this;
            $(".symbol_flow").addClass('active');

            $.each($(".symbol_flow"), function(i, t) {
                if ($(this).hasClass("symbol_flow-sec")) {
                    _this.jsplumb.line.selectEndpoints({ element: $(this).find(".symbol_pivot-start").get(0) }).addClass("active-endpoint");
                    _this.jsplumb.line.selectEndpoints({ element: $(this).find(".symbol_pivot-end").get(0) }).addClass("active-endpoint");
                } else {
                    _this.jsplumb.line.selectEndpoints({ element: this }).addClass("active-endpoint");
                }
            });
        },
        /**
         * 置于顶层
         * 顶层是symbols的最后一个数组,所以这里需要对整个symbols重新排序
         * 而且所有的z-index都得及时更新
         * @return {[type]} [description]
         */
        bringToFront: function(el) {
            var _this = this;

            var symbol = this.getSymbol(this.getId(el)),
                index = this.getIndex(this.getId(el));

            /*this.symbols.*/
        },
        /**
         * 置于底层
         * @return {[type]} [description]
         */
        sendToBack: function(el) {

        },
        /**
         * 监听元素移动
         * @return {[type]} [description]
         */
        groupDragStop: function(e) {
            var _this = this;

            var index = this.getIndex(this.getId($(e.el)));

            if ($(e.el).find(_this.options.selector.symbolConcurrence).length > 0) {
                this.resize.position($(e.el));
            }
            this.debug("dragGroup");
            this.update("update flow in pos", { index: index, pos: e.pos });
        },
        nodeDragStop: function(el) {
            this.debug("dragResize");
            this.update("update flow in resize", el)
        }
    }

    return artboard;
});
