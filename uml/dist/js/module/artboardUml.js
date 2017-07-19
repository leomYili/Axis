/**
 * artboard
 * @return {class}       [画板]
 */
define([
    'text!textPath/tpl.entity.xml.html',
    'text!textPath/tpl.relation.xml.html',
    'text!textPath/tpl.relation.html',
    'text!textPath/tpl.cls.content.html',
    'text!textPath/tpl.entity.tr.html',
    'pubSub',
    'middleWare',
    'symbols',
    'jsplumb',
    'contextmenu',
    'modal'
], function(entityXML, relationXML, relationTpl, clsContent, entityTrTpl, pubSub, middleWare, symbols, jsplumb, contextmenu, modal) {

    var defaults = {
        debug: true,
        className: {
            box: "symbol_box"
        },
        selector: {
            layout: ".layout",
            artboard: ".artboard",
            artboardMenu: "#artboard_context-menu",
            lineMenu: "#line_context-menu",
            attribute: ".symbol_item",
            box: ".symbol_box",
            symbolMenu: "#box_context-menu",
            boxFooter: ".symbol_footer",
            boxshade: ".symbol_shade",
            updateEntity: '#updateEntity'
        },
        tool: {
            lineShow: '.header_item[data-tool="lineshow"]'
        }
    }

    var artboard = function(el, data) {
        this.options = $.extend(true, {}, defaults);

        this.el = el;
        this.data = data || {};
        this.symbols = [];
        this.sid = 0;

        this.pubSub = pubSub.getInstance();
        this.jsplumb = jsplumb.getInstance({
            Container: $(el).get(0),
            ConnectionOverlays: [
                ["Arrow", { location: 1, id: "arrow", length: 10, foldback: 0, width: 10 }]
            ],
            PaintStyle: { stroke: "#00a65a" },
            groupDragStop: _.bind(this.groupDragStop, this)
        });
        this.contextmenu = new contextmenu("artboard", this);

        // 内部数据源
        this.symbols = [];
        this.lines = [];

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
            $(this.el).empty();
            this.symbols = [];
            this.lines = [];
        },
        error: function() {
            var _this = this;
            if (_this.options.debug) {
                _this.debug = Function.prototype.bind.call(console.error, console, "axisLine" + _.now() + "->");
                _this.debug.apply(console, arguments);
            }
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
        // 监听数据变化以及中间件通信
        monitor: function() {
            this.pubSub.subscribe('add symbol', this.addSymbol);
            this.pubSub.subscribe('add line', this.addLine);
            this.pubSub.subscribe('add line to lines', this.addToLines);

            this.pubSub.subscribe('update symbol', this.updateSymbol);
            this.pubSub.subscribe('update symbol in pos', this.updateSymbolInPos);
            this.pubSub.subscribe('update symbol in fk', this.updateSymbolInFk);
            this.pubSub.subscribe('update symbol in see', this.updateSymbolInSee);

            this.pubSub.subscribe('delete symbol', this.deleteSymbol);
            this.pubSub.subscribe('delete line', this.deleteLine);
        },
        update: function(key, data, scope) {
            key = key || 'update';
            this.pubSub.publish(key, data, scope || this);
        },
        // render
        render: function() {},
        renderSymbol: function(tpl, pos, sid) {
            var el = $("<div/>").addClass(this.options.className.box).css({ left: pos.left, top: pos.top }).attr("id", sid).attr("tabindex", "-1").html(tpl).appendTo(this.el);

            this.bindContextMenu(el);
            this.jsplumb.initEntity(sid);
            return el;
            // this.endpointEntity();这里应该不需要了
        },
        /**
         * 数据整体更新,包括连线和symbol主体
         * 先更新symbol内容部分,
         * 再重新连线
         * @return {[type]} [description]
         */
        renderSymbolUpdate: function(tpl, sign) {
            var _this = this;

            var el = $(".symbol_content[data-sign='" + sign + "']");
            this.jsplumb.line.empty(el.get(0));
            el.append(tpl);

            if (el.find(".g-show-more")) {
                el.find('.symbol_shade').addClass('bottom25');
            } else {
                el.find('.symbol_shade').removeClass('bottom25');
            }
            this.jsplumb.initPorperty(el.find(".symbol_item"));

            var index = _this.getIndex((_this.getSymbolToSign(sign)).id);
            var lines = _.flatten(_this.lines[index]);
            $.each(lines, function(i, t) {
                _this.connection({}, t);
            });
            this.entityModal.modal.modal('toggle');
        },
        renderSymbolSee: function(tpl, sign) {
            var _this = this;

            var el = $(".symbol_content[data-sign='" + sign + "']");
            this.jsplumb.line.empty(el.get(0));
            el.append(tpl);

            if (el.find(".g-show-more")) {
                el.find('.symbol_shade').addClass('bottom25');
            } else {
                el.find('.symbol_shade').removeClass('bottom25');
            }

            this.jsplumb.initPorperty(el.find(".symbol_item"));

            var index = _this.getIndex((_this.getSymbolToSign(sign)).id);
            var lines = _.flatten(_this.lines[index]);
            $.each(lines, function(i, t) {
                _this.connection({}, t);
            });
        },
        renderTpl: function(tpl, data) {
            if (!_.isFunction(tpl)) tpl = _.template(tpl);
            return tpl(data)
        },
        // get
        getSign: function(el) {
            return el.attr('data-sign');
        },
        getId: function(el) {
            return el.attr('id');
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
        getArrProperty: function() {

        },
        getLinesFormData: function(data) {
            var _this = this;

            var lines = [];

            $.each(data.properties, function(i, t) {
                var item = {};
                if (!_.isEmpty(t.foreignkey)) {
                    item = t.foreignkey;
                    lines.push({ source: data.id, target: item.associateentity, label: typeof item.displayname !== "undefined" && item.displayname == '' ? 'fk' : item.displayname, key: t.name });
                }
            });

            return lines;
        },
        hasSign: function(sign) {
            var index = -1;
            $.each(this.symbols, function(i, t) {
                if (t.sign === sign) {
                    index = i;
                }
            });
            return index;
        },
        /**
         * 如果当前artboard内不存在任何line关系,则直接更新line目录
         * 如果存在line关系则可以首先直接返回line进行处理之后,再进行更新line
         * @param  {[type]}  lines [description]
         * @return {Boolean}       [description]
         */
        hasSymbolExist: function(lines) {
            var _this = this;

            if (_.isEmpty(lines)) {
                _this.update("add line", []);
            } else {
                _this.update("add line", lines);
                return lines;
            }
        },
        /**
         * 如果当前存在相应的连线关系,则开始查找与之相关的关系,并进行连线
         * @return {Boolean} [description]
         */
        prependToLines: function(lines) {
            var _this = this;

            _this.debug("prependToLines");
            if (!_.isEmpty(lines)) {
                var symbol = _.last(_this.symbols);
                var item = _.filter(lines, _.matcher({ target: symbol.sign }));

                $.each(item, function(i, t) {
                    _this.connection(symbol, t);
                });
            }
        },
        /**
         * 检查类初始化时,是否已有外键或者是引用属性
         * @param  {[type]} lines [description]
         * @return {[type]}       [description]
         */
        appendToLines: function(lines) {
            var _this = this;

            _this.debug("appendToLines");
            var lines = _this.hasSymbolExist(lines);
            $.each(lines, function(i, t) {
                var item = _.filter(_this.symbols, _.matcher({ sign: t.target }));
                if (item.length == 1) {
                    _this.connection(item, t);
                } else if (item.length > 1) {
                    _this.error("存在相同的实体类,请检查api")
                }
            });
        },
        formData: function(data) {
            var _this = this;

            var sd = {},
                index = this.hasSign(data.id);

            if (index == -1 && !_.isUndefined(data.id) && !_.isUndefined(data.tablename)) {
                sd.sign = data.id;
                sd.tablename = data.tablename;
                sd.lines = _this.getLinesFormData(data);
                sd.arr = data;
                if (!_.isUndefined(data.sid)) {
                    sd.sid = data.sid;
                    sd.tpl = data.tpl;
                    sd.position = data.position;
                }
            } else {
                sd.index = index
            }

            return sd;
        },
        loadFormData: function(sd, tpl, position) {
            var ms = sd;
            ms.sid = _.uniqueId('art_');
            ms.tpl = tpl;
            ms.position = position;

            return ms;
        },
        // 处理数据集合
        getData: function() {
            var _this = this;

            var data = {
                xml: _this.getDataXML()
            };

            return data;
        },
        getDataXML: function() {
            return this.renderTpl(entityXML, { entity: this.symbols });
        },
        getTableJson: function(table) {
            if (!_.isElement(table)) return [];

            var arr = "[",
                row = $(table).find("tbody tr"),
                col = $(table).find("th"),
                nullable = -1;

            $.each(row, function(i, t) {
                var r = "{";

                $.each($(t).find("td"), function(m, n) {
                    if ($(n).find(".attribute").attr("type") == "radio" || $(n).find(".attribute").attr("type") == "checkbox") {
                        if ($(n).find(".attribute").is(":checked")) {
                            r += '"' + col.eq(m).attr("name") + '":"true"';
                        } else {
                            r += '"' + col.eq(m).attr("name") + '":"false"';
                        }
                    } else if ($(n).hasClass("foreignkey")) {
                        if ($(n).hasClass('yes')) {
                            r += '"' + col.eq(m).attr("name") + '":{"associateentity":"' + $(n).find(".associateentity").text() + '","displayname":"' + $(n).find(".displayname").text() + '","aliasname":"' + $(n).find(".aliasname").text() + '"}';
                        } else {
                            r += '"' + col.eq(m).attr("name") + '":{}';
                        }
                    } else if ($(n).hasClass("nullable")) {
                        if ($(n).find('input[type="checkbox"]').is(':checked')) {
                            r += '"' + col.eq(m).attr("name") + '":true';
                        } else {
                            r += '"' + col.eq(m).attr("name") + '":false';
                        }
                    } else {
                        if ($(n).find(".attribute").val() == '') {
                            nullable = i;
                            return false;
                        } else {
                            r += '"' + col.eq(m).attr("name") + '":"' + $(n).find(".attribute").val() + '"';
                        }
                    }

                    if (m != $(t).find("td").length - 1) {
                        r += ",";
                    }
                });
                r += (i != row.length - 1) ? "}," : "}";
                arr += r;
            });
            arr += "]";

            if (nullable >= 0) {
                return nullable + 1;
            } else {
                return JSON.parse(arr);
            }
        },
        getLinesData: function() {
            var _this = this;

            var relation = [];

            $.each(_this.jsplumb.getLabel(), function(i, t) {
                var item = {
                    label: t[0].labelText,
                    location: t[0].loc,
                    sourceId: t[1].sourceId,
                    targetId: t[1].targetId
                }

                relation.push(item);
            });

            return relation
        },
        // set
        position: function() {
            this.empty();

            $(this.options.selector.layout).scrollTop(980).scrollLeft(980);
        },
        setRelation: function(opts) {
            this.jsplumb.setRelation(opts);
        },
        /**
         * 重要方法,辨识连接线两端是否合法,且需要做相应的处理,外键必须关联到主键上
         * 需要检查是否与lines相关联,其中,lines是个二维数组,排序很重要
         * @param {[type]} source [description]
         * @param {[type]} target [description]
         */
        setKeyToSymbol: function(source, target, connection) {
            var _this = this;

            var sourceSymbol = _this.getSymbolToSign(source.parent('.symbol_content').attr("data-sign")),
                targetSymbol = _this.getSymbolToSign(target.parent('.symbol_content').attr("data-sign")),
                index = _this.getIndex(sourceSymbol.id),
                lines = _this.lines[index];
            fk = source.attr("data-fk");

            if (_.isEqual(sourceSymbol, targetSymbol) && connection.connection.connector.type != "Flowchart") {
                _this.jsplumb.line.detach(connection);
                _this.debug("自连");

                _this.jsplumb.afreshUml(source, target,source.attr("data-fk"));
                return false;
            }

            var type = connection.connection.getParameter("type")
            if (!_.isUndefined(type)) {
                if (type == "hide") {
                    console.log("这条线是连接到tool上的连线");
                } else if (type == "show") {
                    console.log("这条线是连接到真实节点上的连线");
                }

                _this.bindLineContextMenu(connection);
            } else {
                if (_.isUndefined(fk)) {
                    // 说明这是一个新的外键,但需要判断是否是主键
                    if (source.hasClass("symbol_item-key")) {
                        console.log("主键不能作为外键");
                        _this.jsplumb.line.detach(connection);
                    } else {
                        var key = sourceSymbol.arr.properties[source.index()].name;

                        source.append(' <i class="fk">FK</i> <class>[' + targetSymbol.arr.name + ']</class>').addClass('symbol_item-fk').attr("data-fk", key);

                        _this.update("add line to lines", { index: index, line: { source: sourceSymbol.sign, target: targetSymbol.sign, label: "从属于", key: key } })

                        _this.vailKeyToSymbol(connection);
                    }
                } else {
                    if (lines[_this.inArrayObj("key", fk, lines)].target === targetSymbol.sign) {
                        if (source.find("class").length == 0) {
                            source.append('<class>[' + targetSymbol.arr.name + ']</class>');
                            _this.bindLineContextMenu(connection);
                            _this.jsplumb.line.repaintEverything();
                        }
                    } else {
                        console.log("不存在关系,该连线违法,需加上提示");
                        _this.jsplumb.line.detach(connection);
                    }
                }
            }
        },
        /**
         * 校验连线是否合法,结束点必须是主键,否则需要校正
         * @param  {[type]} conn [description]
         * @return {[type]}      [description]
         */
        vailKeyToSymbol: function(conn) {
            var _this = this;

            var source = $(conn.source),
                target = $(conn.target);

            if (!target.hasClass('symbol_item-key')) {
                _this.jsplumb.line.detach(conn);
                var newTarget = target.parents('.symbol_content').children('.symbol_item-key');
                _this.jsplumb.connectSelf(source.get(0), newTarget.get(0),source.attr("data-fk"));
            } else {
                conn.connection.addOverlay(["Label", { label: source.attr("data-fk"), id: "displayName", location: 0.5, cssClass: "jspl-label" }]);
                _this.bindLineContextMenu(conn);
            }
        },
        connection: function(data, line) {
            var _this = this;

            var source = $(".symbol_content[data-sign='" + line.source + "']"),
                target = $(".symbol_content[data-sign='" + line.target + "']"),
                fk = source.find(".symbol_item-fk[data-fk='" + line.key + "']").get(0),
                pk = target.find(".symbol_item-key").get(0);

            if (!_.isUndefined(line.key) && !_.isUndefined(fk) && !_.isUndefined(pk)) {
                _this.jsplumb.connectSelf(fk, pk,line.key);
            } else if (_.isUndefined(fk) && !_.isUndefined(pk) && source.find(".g-show-more").css("display") != "none") {
                _this.connectionToTool(source, pk, line.key);
            } else {
                _this.debug("有可能是附属类,需要进一步验证");
            }
        },
        /**
         * 将隐藏的连线,重新连接到tool上
         * @param  {[type]} source [description]
         * @param  {[type]} target [description]
         * @param  {[type]} conn   [description]
         * @return {[type]}        [description]
         */
        connectionToTool: function(source, target, key) {
            var _this = this;

            var config = {
                source: source.find('.g-show-more').get(0),
                target: target,
                parameters: {
                    "type": 'hide',
                    "source": key
                },
                overlays: [
                    ["Label", { label: key, id: "displayName", location: 0.5, cssClass: "jspl-label" }]
                ],
            };

            _this.jsplumb.connect(config);
        },
        /**
         * 新增一个symbol
         * 增加初始化时,对于折叠层的判断
         * @param {[type]} obj [description]
         */
        addSymbol: function(obj) {
            var _this = this;

            if (_.isUndefined(obj.index)) {
                _this.symbols.push({
                    id: _.isUndefined(obj.sid) ? _this.sid : obj.sid, // 内部标识id
                    sign: obj.sign,
                    tablename: obj.tablename,
                    arr: obj.arr, // 缓存原始数据
                    position: obj.position, // 内部使用位置信息
                    lines: obj.lines || [], // 内部line信息
                    tpl: obj.tpl
                });
                _this.debug(_this.symbols)

                _this.renderSymbol(obj.tpl, obj.position, _.isUndefined(obj.sid) ? _this.sid : obj.sid);
                _this.appendToLines(obj.lines);
            } else {
                _this.debug("已存在相同的实体类");
            }
        },
        /**
         * 给symbol新增属性
         */
        addProperty: function() {

        },
        /**
         * 新增一条连线记录
         * @return {[type]} [description]
         */
        addLine: function(obj) {
            var _this = this;

            if (_.isEmpty(obj)) {
                var _lines = _.flatten(_this.lines);
                _this.prependToLines(_lines);
            }
            _this.lines.push(obj);

            this.debug(this.symbols, this.lines);
        },
        /**
         * 新增外键关系
         * 要注意,得同时更新symbols中的数据
         * @param {[type]} data [description]
         */
        addToLines: function(data) {
            this.debug("lineToLines");
            this.lines[data.index].push(data.line);

            this.update("update symbol in fk", data);

            this.debug(this.symbols, this.lines);
        },
        /**
         * 更新已存在于artboard之上的symbol,并相应更新外键关系
         * @param  {[type]} obj [description]
         * @return {[type]}     [description]
         */
        updateSymbol: function(el) {
            var _this = this;

            var sign = el.attr("data-sign"),
                sd = _this.getTableJson(el.get(0));

            if (_.isNumber(sd)) {
                this.debug("第" + sd + "行存在空白");
            } else {
                var lines = _this.getLinesFormData({ id: sign, properties: sd }),
                    index = _this.getIndex((_this.getSymbolToSign(sign)).id);
                _this.symbols[index].arr.properties = sd;
                //_this.symbols[index].lines = _this.lines[index] = lines;

                console.log(sd, _this.lines, _this.symbols);
                var _data = {
                    type: $(".symbol_content[data-sign='" + sign + "']").find('.g-show-more').css("display") == "none" ? "show" : 'hide',
                    properties: sd
                }

                _this.renderSymbolUpdate(_this.renderTpl(clsContent, _data), sign);
            }
        },
        /**
         * 这里直接找到元素,更新即可,之前已做了大量的校验
         * @param  {[type]} data [description]
         * @return {[type]}      [description]
         */
        updateSymbolInFk: function(data) {
            var _this = this;

            var index = _this.inArrayObj("name", data.line.key, this.symbols[data.index].arr.properties);

            this.symbols[data.index].arr.properties[index].foreignkey = {
                "associateentity": data.line.target,
                "aliasname": data.line.target,
                "displayname": "从属于"
            }
        },
        updateSymbolInPos: function(data) {
            var _this = this;

            var pos = { left: data.pos[0], top: data.pos[1] };
            this.symbols[data.index].position = pos;
        },
        /**
         * 根据数据,直接渲染不同的内容
         * @param  {[type]} data [description]
         * @return {[type]}      [description]
         */
        updateSymbolInSee: function(data) {
            var _this = this;

            var symbol = this.getSymbolToSign(data.sign);

            var _data = {
                type: data.choose,
                properties: symbol.arr.properties
            }

            _this.renderSymbolSee(_this.renderTpl(clsContent, _data), data.sign);
        },
        /**
         * 删除symbol,节点与数据都要更新
         * @param  {[type]} el [description]
         * @return {[type]}    [description]
         */
        deleteSymbol: function(el) {
            var index = this.getIndex(this.getId(el));
            this.symbols.splice(index, 1);
            this.lines.splice(index, 1);
            this.jsplumb.line.remove(el);
        },
        /**
         * 删除连线,
         * 其中最主要的就是找到source点的数据,删除其中的外键属性
         * 然后更新内部lines数据体,
         * 最后删掉这条线
         * @param  {[type]} conn [description]
         * @return {[type]}      [description]
         */
        deleteLine: function(conn) {
            var fk;
            console.log(conn);
            if (!_.isUndefined(conn.getParameter("type"))) {
                fk = conn.getParameter("source");
            } else {
                fk = $(conn.source).attr("data-fk");
            };

            var source = $(conn.source).closest(".symbol_content").attr("data-sign"),
                target = $(conn.target).closest(".symbol_content").attr("data-sign"),
                index = this.getIndex(this.getSymbolToSign(source).id),
                index1 = -1,
                index2 = -1,
                index3 = this.inArrayObj("name", fk, this.symbols[index].arr.properties);

            $.each(this.lines, function(i, t) {
                for (var j = 0; j < t.length; j++) {
                    if (source == t[j].source && target == t[j].target && fk == t[j].key) {
                        index1 = i;
                        index2 = j;
                    }
                }
            });

            var line = this.lines[index1].splice(index2, 1);
            this.symbols[index].arr.properties[index3].foreignkey = {};

            if (_.isUndefined(conn.getParameter("type"))) {
                $(conn.source).removeClass('symbol_item-fk').removeAttr('data-fk').find("i,class").remove();
            }

            this.jsplumb.line.detach(conn);
            this.jsplumb.line.repaintEverything();
            this.debug("delete", this.lines)
        },
        /**
         * 初始化symbol内部使用数据
         * @return {[type]} [description]
         */
        initSymbol: function(data, ui, tpl) {
            var sd = this.formData(data);

            sd.position = ui.position;
            sd.tpl = tpl;
            return sd;
        },
        // create
        createSymbol: function(ui) {
            var _this = this,
                _symbols = new symbols();

            _symbols.init(this.getSign(ui.draggable), function() {
                _this.update("add symbol", _this.initSymbol(_symbols.getData(), ui, _symbols.getTpl()));
                //_.isFunction(callback) && callback.call(_this);
            });
        },
        createSymbols: function(data) {
            console.log(data);
            var _this = this,
                _symbols = new symbols(),
                node = data.node,
                arr = [];

            if (!_.isArray(node)) {
                arr.push(node);
                node = arr;
            };
            $.each(node, function(i, t) {
                var sd = {
                    id: t.id,
                    tablename: t.tablename,
                    name: t.name,
                    displayname: t.displayname,
                    properties: t.propertylist.property
                };
                _this.update("add symbol", _this.loadFormData(_this.formData(sd), _symbols.loadData(sd), { left: Number(t["_x"]), top: Number(t["_y"]) }));
            });
        },
        //setup
        endpointEntity: function() {
            this.jsplumb.initEntity(this.sid);
        },
        endpointPorperty: function() {
            this.jsplumb.initPorperty($("#" + this.sid).find(this.options.selector.attribute));
        },
        allSelected: function() {
            var _this = this;
            $(".symbol_box").addClass('active');

            $.each($(".symbol_box"), function(i, t) {
                _this.jsplumb.line.selectEndpoints({ element: this }).addClass("active-endpoint");
            });
        },
        // event
        event: function() {
            this.drop();
            this.contextMenu();
            this.bindConnect();
            this.bindClick();
            this.bindKeyDown();
            this.bindSave();
            this.bindCollapse();
        },
        bindClick: function() {
            var _this = this;

            $(this.el).on("click", function(event) {
                if (event.target == this) {
                    $(".active-line").removeClass('active-line');
                    _this.activeLine = null;
                    $(".active-endpoint").removeClass('active-endpoint');
                    $(".symbol_box.active").removeClass('active');
                }
            }).on("click", ".symbol_box", function(e) {
                $(".active-line").removeClass('active-line');
                _this.activeLine = null
                if (!$(this).hasClass("active")) {
                    $(".active-endpoint").removeClass('active-endpoint');
                    $(".symbol_box.active").removeClass('active');
                    /*_this.jsplumb.line.selectEndpoints({ element: this }).addClass("active-endpoint");*/
                    $(this).addClass("active");
                }
                return false
            }).on("dblclick", ".symbol_box", function(e) {
                _this.symbolEdit($(this));
            })

            this.jsplumb.line.bind("click", function(conn, event) {
                $(".active-line").removeClass('active-line');
                $(".active-endpoint").removeClass('active-endpoint');
                $(".symbol_box.active").removeClass('active');
                conn.addClass('active-line');
                _this.activeLine = conn;
            });

            $("#addProperty").click(function() {
                var datatype = ["VARCHAR", "INT", "FLOAT", "DOUBLE"];
                var data = {
                    datatype: datatype
                };
                $("#entity").find("tbody").append(_this.renderTpl(entityTrTpl, data));
            });
        },
        bindKeyDown: function() {
            var _this = this;

            $(document).keydown(function(event) {
                switch (event.keyCode) {
                    case 8:
                        if ($(".symbol_box.active").length > 0) {
                            _this.symbolDelete($(".symbol_box.active"));
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
        bindConnect: function() {
            var _this = this;

            this.jsplumb.line.bind("connection", function(info) {
                var source = $(info.source),
                    target = $(info.target);

                _this.setKeyToSymbol(source, target, info);
            });

            this.jsplumb.line.bind("connectionDrag", function(info) {
                // 在创建连线时,主动把主键暴露出来
                $(info.source).addClass("symbol-source");
                $(".symbol_item").addClass("symbol-drag");
                $(".symbol_item-key").addClass("symbol-drag");
            });

            this.jsplumb.line.bind("connectionDragStop", function(info) {
                // 在创建连线时,主动把主键暴露出来
                $(info.source).removeClass("symbol-source");
                $(".symbol_item").removeClass("symbol-drag")
                $(".symbol_item-key").removeClass("symbol-drag");
            });

            this.jsplumb.line.bind("connectionDetached", function(info) {
                // 在创建连线时,主动把主键暴露出来
                $(info.source).removeClass("symbol-source");
                $(".symbol_item").removeClass("symbol-drag")
                $(".symbol_item-key").removeClass("symbol-drag");
            });

        },
        drop: function() {
            var _this = this;
            $(this.el).droppable({
                scope: "axis",
                drop: function(event, ui) {
                    _this.sid = _.uniqueId('art_');
                    _this.createSymbol(ui);
                }
            });
        },
        contextMenu: function() {
            var _this = this;
            /*        $(this.options.selector.artboard).on("contextmenu", this.options.selector.box, function(e) {
            });*/
            $(this.options.selector.artboard).contextmenu({
                target: _this.options.selector.artboardMenu,
                before: function() {
                    $(_this.options.selector.symbolMenu).removeClass('open');
                },
                onItem: function(context, e) {
                    var type = $(e.currentTarget).find('.menu-type').text();
                    _this.contextMenuType(type, $(_this.options.selector.artboard));
                }
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
            arr.push($(conn.connection.getOverlay("displayName").getElement()));

            $.each(arr, function() {
                this.contextmenu({
                    target: _this.options.selector.lineMenu,
                    before: function() {
                        $(_this.options.selector.artboardMenu).removeClass('open');
                    },
                    onItem: function(context, e) {
                        var type = $(e.currentTarget).find('.menu-type').text();
                        _this.contextMenuType(type, conn.connection);
                        this.closemenu();
                    }
                });
            });

            this.jsplumb.line.repaintEverything();
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
                    break;
                case "创建连线":
                    _this.lined();
                    break;
            }
        },
        symbolEdit: function(el) {
            var _this = this;

            _this.entityModal = new modal("entity", _this.getSymbol(_this.getId(el)));
        },
        symbolDelete: function(el) {
            var _this = this;

            if (el instanceof jQuery) {
                _this.update("delete symbol", el)
            } else {
                _this.update("delete line", el)
            }
        },
        lined: function() {
            var _this = this;

            if ($(_this.options.selector.boxshade).length == 0) {
                $(_this.options.tool.lineShow).removeClass('active');
                return false;
            }
            $(_this.options.selector.layout).addClass('layout-line');
            $(_this.options.tool.lineShow).addClass('active');
            $(_this.options.selector.boxshade).addClass('symbol_shade-hide');
        },
        bindSave: function() {
            var _this = this;

            $(this.options.selector.updateEntity).on("click", function() {
                _this.update("update symbol", $("#entity").find(".modal-body table"));
            });
        },
        /**
         * 监听元素移动
         * @return {[type]} [description]
         */
        groupDragStop: function(e) {
            var _this = this;

            var index = this.getIndex(this.getId($(e.el)));
            this.debug("dragGroup");
            this.update("update symbol in pos", { index: index, pos: e.pos });
            this.jsplumb.line.repaintEverything();
        },
        // 收起或者展开
        // 隐藏有问题,尝试改成重新渲染节点试试
        // 每次只操作一条连线,只有连线产生了,对其所做的删除还有重连才有意义
        // 这里只发布事件,修改原有content内容,并重新连线
        collapes: function(m, el) {
            var _this = this;

            var config = {
                sign: el.attr("data-sign")
            };
            if (m) {
                console.log("收缩所有属性,并重新连接");
                config.choose = 'hide';
            } else {
                console.log("展开所有属性,并重新连接");
                config.choose = 'show';
            }

            _this.update("update symbol in see", config)
        },
        // 绑定收起和展开按钮进行实体收缩
        bindCollapse: function() {
            var _this = this;

            $(".uml").on("click", '.g-show-more', function() {
                $(this).hide();
                $(this).next().show();
                _this.collapes(false, $(this).closest('.symbol_content'));

                return false;
            });

            $(".uml").on("click", '.g-hide-more', function() {
                $(this).hide();
                $(this).prev().show();
                _this.collapes(true, $(this).closest('.symbol_content'));

                return false;
            });
        }
    }

    return artboard;
});
