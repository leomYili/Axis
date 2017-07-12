define([
    'text!textPath/tpl.flow.control.html',
], function(flowControl) {
    var defaults = {
        stage: document, //舞台
        root: null,
        refresh: null,
        dragStop: null
    }

    var resize = function(el, options) {
        this.options = $.extend(true, {}, defaults, options);
        this.target = el instanceof jQuery ? el : $(el);
        this.init();
    };

    resize.prototype = {
        init: function() {
            this.initResizeBox();
        },
        renderTpl: function(tpl, data) {
            if (!_.isFunction(tpl)) tpl = _.template(tpl);
            return tpl(data)
        },
        initResizeBox: function() {
            var _this = this;

            this.ox = 0; // 初始位置x
            this.oy = 0; // 初始位置y
            this.ow = 0; // 初始宽度
            this.oh = 0; // 初始高度

            this.oLeft = 0; // 初始元素left定位
            this.oTop = 0; // 初始元素top定位
            this.org = null; // 映射元素
            this.orgItem = null; // 映射子元素,用于计算范围
            this.minWidth = 0; // 映射元素最小宽度
            this.minHeight = 0; // 映射元素最小高度
            this.maxWidth = 0; // 映射元素最大宽度
            this.maxHeight = 0; // 映射元素最大高度

            this.helper = $(this.renderTpl(flowControl)).appendTo(this.target); // 缩放助手
            this.bindResizeEvent(this.helper);
        },
        /**
         * 根据传入的操作节点进行定位
         * @param  {[type]} target [description]
         * @return {[type]}        [description]
         */
        position: function(target) {
            var _this = this;

            this.org = target;
            this.orgItem = target.children('.symbol_flow-concurrence');
            this.oLeft = this.org.offset().left - this.options.root.offset().left;
            this.oTop = this.org.offset().top - this.options.root.offset().top;
            this.minWidth = parseInt(this.orgItem.css('minWidth').replace('px', ''));
            this.minHeight = parseInt(this.orgItem.css('minHeight').replace('px', ''));
            this.maxHeight = this.org.closest('.symbol_flow-concurrence').outerHeight();
            this.maxWidth = this.org.closest('.symbol_flow-concurrence').outerWidth();

            this.helper.css({
                width: _this.orgItem.outerWidth(),
                height: _this.orgItem.outerHeight(),
                left: _this.oLeft,
                top: _this.oTop
            })
            _this.show();
        },
        show: function() {
            this.helper.css("display", "block");
        },
        hide: function() {
            this.helper.css("display", "none");
        },
        bindResizeEvent: function(el) {
            var _this = this;

            var nwMove = false;
            el.on('mousedown', '.nw', function(e) {
                _this.ox = e.pageX;
                _this.oy = e.pageY;
                _this.ow = el.width();
                _this.oh = el.height();
                _this.oLeft = _this.org.offset().left - _this.options.root.offset().left;
                _this.oTop = _this.org.offset().top - _this.options.root.offset().top;

                nwMove = true;
                console.log("nw???");

                $(_this.options.stage).on('mousemove', _.throttle(function(e) {
                    if (nwMove) {
                        var x = e.pageX - _this.ox;
                        var y = e.pageY - _this.oy;
                        var master = {
                            height: (_this.oh - y) < _this.minHeight ? _this.minHeight : (_this.oh - y) > _this.maxHeight ? _this.maxHeight : (_this.oh - y),
                            top: _this.oTop + y,
                            width: (_this.ow - x) < _this.minWidth ? _this.minWidth : (_this.ow - x) > _this.maxWidth ? _this.maxWidth : (_this.ow - x),
                            left: _this.oLeft + x
                        };
                        el.css(master);
                        _this.org.css(master);
                    }

                    _.isFunction(_this.options.refresh) && _this.options.refresh();
                },50)).on('mouseup', function() {
                    nwMove = false;
                    $(this).off('mousemove');
                    $(this).off('mouseup');
                    _.isFunction(_this.options.dragStop) && _this.options.dragStop(_this.org);
                });
            });

            var neMove = false;
            el.on('mousedown', '.ne', function(e) {
                _this.ox = e.pageX;
                _this.oy = e.pageY;
                _this.ow = el.width();
                _this.oh = el.height();
                _this.oTop = _this.org.offset().top - _this.options.root.offset().top;

                neMove = true;
                console.log("ne???");

                $(_this.options.stage).on('mousemove', _.throttle(function(e) {
                    if (neMove) {
                        var x = e.pageX - _this.ox;
                        var y = e.pageY - _this.oy;
                        var master = {
                            height: (_this.oh - y) < _this.minHeight ? _this.minHeight : (_this.oh - y) > _this.maxHeight ? _this.maxHeight : (_this.oh - y),
                            top: _this.oTop + y,
                            width: (_this.ow + x) < _this.minWidth ? _this.minWidth : (_this.ow + x) > _this.maxWidth ? _this.maxWidth : (_this.ow + x)
                        };
                        el.css(master);
                        _this.org.css(master);
                    }

                    _.isFunction(_this.options.refresh) && _this.options.refresh();
                },50)).on('mouseup', function() {
                    neMove = false;
                    $(this).off('mousemove');
                    $(this).off('mouseup');
                    _.isFunction(_this.options.dragStop) && _this.options.dragStop(_this.org);
                });
            });

            var swMove = false;
            el.on('mousedown', '.sw', function(e) {
                _this.ox = e.pageX;
                _this.oy = e.pageY;
                _this.ow = el.width();
                _this.oh = el.height();
                _this.oLeft = _this.org.offset().left - _this.options.root.offset().left;

                swMove = true;
                console.log("sw???");

                $(_this.options.stage).on('mousemove', _.throttle(function(e) {
                    if (swMove) {
                        var x = e.pageX - _this.ox;
                        var y = e.pageY - _this.oy;
                        var master = {
                            height: (_this.oh + y) < _this.minHeight ? _this.minHeight : (_this.oh + y) > _this.maxHeight ? _this.maxHeight : (_this.oh + y),
                            width: (_this.ow - x) < _this.minWidth ? _this.minWidth : (_this.ow - x) > _this.maxWidth ? _this.maxWidth : (_this.ow - x),
                            left: _this.oLeft + x
                        };
                        el.css(master);
                        _this.org.css(master);
                    }

                    _.isFunction(_this.options.refresh) && _this.options.refresh();
                },50)).on('mouseup', function() {
                    swMove = false;
                    $(this).off('mousemove');
                    $(this).off('mouseup');
                    _.isFunction(_this.options.dragStop) && _this.options.dragStop(_this.org);
                });
            });

            var seMove = false;
            el.on('mousedown', '.se', function(e) {
                _this.ox = e.pageX;
                _this.oy = e.pageY;
                _this.ow = el.width();
                _this.oh = el.height();

                seMove = true;
                console.log("se???");

                $(_this.options.stage).on('mousemove', _.throttle(function(e) {
                    if (seMove) {
                        var x = e.pageX - _this.ox;
                        var y = e.pageY - _this.oy;
                        var master = {
                            height: (_this.oh + y) < _this.minHeight ? _this.minHeight : (_this.oh + y) > _this.maxHeight ? _this.maxHeight : (_this.oh + y),
                            width: (_this.ow + x) < _this.minWidth ? _this.minWidth : (_this.ow + x) > _this.maxWidth ? _this.maxWidth : (_this.ow + x)
                        };
                        el.css(master);
                        _this.org.css(master);
                    }

                    _.isFunction(_this.options.refresh) && _this.options.refresh();
                },50)).on('mouseup', function() {
                    seMove = false;
                    $(this).off('mousemove');
                    $(this).off('mouseup');
                    _.isFunction(_this.options.dragStop) && _this.options.dragStop(_this.org);
                });
            });
        }
    }

    return resize;
});
