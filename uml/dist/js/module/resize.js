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
            this.helperLeft = 0; // 初始助手left定位
            this.helperTop = 0; // 初始助手top定位
            this.org = null; // 映射元素
            this.parent = ''; // 父元素
            this.orgItem = null; // 映射子元素,用于计算范围
            this.minWidth = 0; // 映射元素最小宽度
            this.minHeight = 0; // 映射元素最小高度
            this.maxWidth = 0; // 映射元素最大宽度
            this.maxHeight = 0; // 映射元素最大高度

            this.helper = $(this.renderTpl(flowControl)).appendTo(this.target); // 缩放助手
            this.bindResizeEvent(this.helper);
        },
        offset: function(curEle) {
            var totalLeft = null,
                totalTop = null,
                par = curEle.offsetParent;
            //首先加自己本身的左偏移和上偏移
            totalLeft += curEle.offsetLeft;
            totalTop += curEle.offsetTop
            //只要没有找到body，我们就把父级参照物的边框和偏移也进行累加
            while (par) {
                if (navigator.userAgent.indexOf("MSIE 8.0") === -1) {
                    //累加父级参照物的边框
                    totalLeft += par.clientLeft;
                    totalTop += par.clientTop
                }

                //累加父级参照物本身的偏移
                totalLeft += par.offsetLeft;
                totalTop += par.offsetTop
                par = par.offsetParent;
            }

            return {
                left: totalLeft,
                top: totalTop
            }
        },
        scrollArtboard: function(pos, el) {
            var _this = this;

            var artboardWidth = $(".artboard.flow").outerWidth(),
                artboardHeight = parseFloat($(".artboard.flow").outerHeight()) - 42,
                elWidth = el.outerWidth(),
                elHeight = el.outerHeight(),
                isConcurrenceChild = el.parent('.symbol_flow-concurrence').length > 0 ? true : false;

            if (isConcurrenceChild) {
                if (_this.offset(el.get(0)).left + elWidth > artboardWidth) {
                    console.log("并发体越界");
                    $(".artboard.flow").scrollLeft(_this.offset(el.get(0)).left + elWidth);
                }

                if (_this.offset(el.get(0)).top + elHeight > artboardHeight) {
                    console.log("并发体越界");
                    $(".artboard.flow").scrollTop(_this.offset(el.get(0)).top + elHeight);
                }
            } else {
                // 长度长于画布
                if (pos.left + elWidth > artboardWidth) {
                    $(".artboard.flow").scrollLeft(pos.left + elWidth);
                }

                if (pos.top + elHeight > artboardHeight) {
                    $(".artboard.flow").scrollTop(pos.top + elHeight);
                }
            }
        },
        hasBeyond: function(el,master) {
            var _this = this;

            if (_this.isConcurrenceChild) {
                var parentOffset = _this.offset(_this.parent.get(0));
                parentOffset.height = parentOffset.top + _this.parent.outerHeight();
                parentOffset.width = parentOffset.left + _this.parent.outerWidth();
                var elOffset = _this.offset(el.get(0));
                elOffset.height = elOffset.top + el.outerHeight();
                elOffset.width = elOffset.left + el.outerWidth();

                if (master.left < 0 || master.top < 0) {
                    $(_this.options.stage).trigger('mouseup');
                }

                if (parentOffset.height < elOffset.height || parentOffset.width < elOffset.width) {
                    $(_this.options.stage).trigger('mouseup');
                }
            }
        },
        /**
         * 根据传入的操作节点进行定位
         * 新增根据parentId来判断并发体中的定位校准
         * @param  {[type]} target [description]
         * @return {[type]}        [description]
         */
        position: function(target, parentId) {
            var _this = this;

            this.org = target;
            this.parent = $("#" + parentId);
            this.orgItem = target.children('.symbol_flow-concurrence');
            this.oLeft = (this.org.offset().left - this.options.root.offset().left) < parseFloat(this.org.css('left')) ? parseFloat(this.org.css('left')) : (this.org.offset().left - this.options.root.offset().left);
            this.oTop = (this.org.offset().top - this.options.root.offset().top) < parseFloat(this.org.css('top')) ? parseFloat(this.org.css('top')) : (this.org.offset().top - this.options.root.offset().top);
            this.minWidth = parseFloat(this.orgItem.css('minWidth').replace('px', ''));
            this.minHeight = parseFloat(this.orgItem.css('minHeight').replace('px', ''));
            this.maxHeight = parseFloat(this.org.closest('.symbol_flow-concurrence').outerHeight());
            this.maxWidth = parseFloat(this.org.closest('.symbol_flow-concurrence').outerWidth());

            this.helperLeft = parseFloat(this.offset(target.get(0)).left);
            this.helperTop = parseFloat(this.offset(target.get(0)).top) - 42; // 顶部偏移

            this.isConcurrenceChild = parentId == "artboard" ? false : true;

            this.helper.css({
                width: _this.orgItem.outerWidth(),
                height: _this.orgItem.outerHeight(),
                left: _this.helperLeft,
                top: _this.helperTop
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
                _this.oLeft = _this.isConcurrenceChild ? _this.org.offset().left - _this.parent.offset().left : _this.offset(_this.org.get(0)).left;
                _this.oTop = _this.isConcurrenceChild ? _this.org.offset().top - _this.parent.offset().top : parseFloat(_this.offset(_this.org.get(0)).top) - 42;

                _this.helperLeft = parseFloat(_this.offset(_this.org.get(0)).left);
                _this.helperTop = parseFloat(_this.offset(_this.org.get(0)).top) - 42;

                nwMove = true;

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

                        var master2 = {
                            height: master.height,
                            top: _this.helperTop + y,
                            width: master.width,
                            left: _this.helperLeft + x
                        }

                        el.css(master2);
                        _this.org.css(master);
                        _this.scrollArtboard(master2, el);
                        _this.hasBeyond(el,master);
                    }

                    _.isFunction(_this.options.refresh) && _this.options.refresh();
                }, 50)).on('mouseup', function() {
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
                _this.oTop = _this.isConcurrenceChild ? _this.org.offset().top - _this.parent.offset().top : parseFloat(_this.offset(_this.org.get(0)).top) - 42;

                _this.helperTop = parseFloat(_this.offset(_this.org.get(0)).top) - 42;

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

                        var master2 = {
                            height: master.height,
                            top: _this.helperTop + y,
                            width: master.width
                        }

                        el.css(master2);
                        _this.org.css(master);
                        _this.scrollArtboard(master2, el);
                        _this.hasBeyond(el,master);
                    }

                    _.isFunction(_this.options.refresh) && _this.options.refresh();
                }, 50)).on('mouseup', function() {
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
                _this.oLeft = _this.isConcurrenceChild ? _this.org.offset().left - _this.parent.offset().left : _this.offset(_this.org.get(0)).left;

                _this.helperLeft = parseFloat(_this.offset(_this.org.get(0)).left);

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

                        var master2 = {
                            height: master.height,
                            width: master.width,
                            left: _this.helperLeft + x
                        }

                        el.css(master2);
                        _this.org.css(master);
                        _this.scrollArtboard(master2, el);
                        _this.hasBeyond(el,master);
                    }

                    _.isFunction(_this.options.refresh) && _this.options.refresh();
                }, 50)).on('mouseup', function() {
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
                        _this.scrollArtboard(master, el);
                        _this.hasBeyond(el,master);
                    }

                    _.isFunction(_this.options.refresh) && _this.options.refresh();
                }, 50)).on('mouseup', function() {
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
