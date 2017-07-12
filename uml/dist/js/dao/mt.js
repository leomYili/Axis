define([
  'text!textPath/tpl.flowNode.xml.html'
], function(flowNodeXml) {
    /**
     * 一维数组解析成多维数组的方法
     * @param  {[type]} data [description]
     * @param  {[type]} key  [description]
     * @return {[type]}      [description]
     */
    return function(data) {
        var OBJ = {};
        var CURRENT;
        var TEM;
        this.root = null;
        this.Node = function(e) {
            this.id = e.id;
            this.shape = e.shape;
            this.sign = e.sign;
            this.shapeName = e.shapeName;
            this.parentId = e.parentId;
            this.position = e.position;
            this.arr = e.arr;
            this.level = e.level;
            this.tpl = e.tpl;
            this.children = [];
        };
        this.renderTpl=function(tpl, data) {
            if (!_.isFunction(tpl)) tpl = _.template(tpl);
            return tpl(data)
        },
        this.insert = function(e, key) {
            CURRENT = OBJ;

            function recursiveAdd(tem, e) {
                if (tem.id == e.parentId) {
                    tem.children.push(e);
                    CURRENT = CURRENT[tem.shapeName];
                    CURRENT[e.shapeName] = {};

                } else {
                    for (var i = 0; i < tem.children.length; i++) {
                        if (tem.shapeName == TEM.shapeName) {
                            CURRENT = OBJ;
                        }
                        CURRENT = CURRENT[tem.shapeName];

                        recursiveAdd(tem.children[i], e);
                    }
                }
            }
            if (e != undefined) {
                e = new this.Node(e);
            } else {
                return;
            }
            if (this.root == null) {
                this.root = e;
                OBJ[e.shapeName] = {};
            } else {
                TEM = this.root;
                recursiveAdd(TEM, e);
            }
        };
        this.init = function(start, data, key) {
            var _this = this;
            _this.insert(start, "id");
            for (var i = 0; i < data.length; i++) {
                _this.insert(data[i], "id");
            }

            return {
                stringify: OBJ,
                json: TEM,
                xml: _this.getDom(TEM)
            };
        };

        this.getDom = function(obj) {
            var _this = this;
            var html = '<nodes>';
            for (var i = 0; i < obj.children.length; i++) {
                var node = obj.children[i];
                html += _this.renderTpl(flowNodeXml,node);
                html += _this.getDom(node);
                html += '</node>';
            }
            html += '</nodes>';
            return html;
        };

    }
});
