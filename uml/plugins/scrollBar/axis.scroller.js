! function($,window,document) {
    var defaults = {
        wheelStep: 16, // 滚动步长
        BoxClassName: "scroller-box", //滚动框样式
        BarClassName: "scroller-bar", //滚动条样式
        top: 0, // 顶部偏移值
        height: 0, // 主体高度
        hover: false, //是否鼠标经过显示
        draggable: true // 是否开启拖拽滚动事件
    };

    var scroller = function(el, options) {
        this.element = el;
        this.options = $.extend(true, {}, defaults, options);
        this._creat();
    };

    scroller.prototype = {
        // 组件初始化
        _creat: function() {
            var _this = this;
            var options = _this.options;
            var el = _this.element;
            el.css("height", options.height);
            if (el.css("position") !== "relative") el.css("position", "relative");
            if (el.css("overflow") !== "hidden") el.css("overflow", "hidden");

            // 需要有一个直接子元素
            var child = this._child = el.children(':first');
            if (child.length) {
                child.css({ top: options.top, position: "absolute" });
                _this.reset();
            } else {
                return;
            }
        },
        scrollBox: function() {
            var _this = this;
            this._box = $('<div class="' + _this.options.BoxClassName + '" style="position:absolute;display:' + (_this.options.hover ? 'none' : 'block') + ';line-height:0;""></div>');
        },
        scrollBar: function(options) {
            var _this = this;
            this._bar = $('<div class="' + _this.options.BarClassName + '" style="position:absolute;display:' + (_this.options.hover ? 'none' : 'block') + '"></div>');
        },
        hover: function() {
            var _this = this;
            this.element.on('mouseenter', function() {
                _this.refresh();
                _this._box.css("display", "block");
                _this._bar.css("display", "block");
            }).on('mouseleave', function() {
                _this._box.css("display", "none");
                _this._bar.css("display", "none");
            });
        },
        refresh: function() {
            var _this = this;
            var _boxHeight = this.element.innerHeight() - 2 * parseInt(_this._box.css("top"));
            var _rate = this.element.innerHeight() / this._child.outerHeight();
            var _barHeight = Math.round(_rate * _boxHeight);
            if (_rate >= 1) {
                _this._box.css("height", 0);
                _this._bar.css("height", 0);
                return;
            }
            _this._box.css("height", _boxHeight);
            _this._bar.css("height", _barHeight);

            if (_this.options.draggable) {
                var boundary = {
                    scrollMaxTop: _boxHeight - _barHeight + parseInt(_this._box.css("top")),
                    scrollMinTop: parseInt(_this._box.css("top"))
                }
                _this.draggable(boundary);
            }
        },
        followElement: function(wrapper, child, folloWrapper, followChild, offset1, offset2) {
            var _this = this;
            var rate = (parseInt(child.css("top")) - offset1) / (child.outerHeight() - wrapper.innerHeight());

            var _top = (followChild.outerHeight() - folloWrapper.innerHeight()) * rate + offset2;

            followChild.css("top", _top);
        },
        // 函数节流，使事件触发占用的资源减少
        throttle: function(fn, interval) {
            var canRun = true;
            return (function() {
                if (!canRun) return;
                canRun = false;
                setTimeout(function() {
                    fn.apply(this, arguments);
                    canRun = true;
                }, interval);
            })();
        },
        // 使用mouse事件来完成bar的拖拽事件
        draggable: function(boundary) {
            var _this = this;

            _this._bar.on("mousedown", function(e) {
                var startX = e.pageX - this.offsetLeft,
                    startY = e.pageY - this.offsetTop;
                $(document).on("mousemove", function(e) {
                    _this.throttle(function() {
                        var moveX = e.pageX - startX,
                            moveY = e.pageY - startY;

                        if (boundary.scrollMaxTop) {
                            moveY = moveY < boundary.scrollMinTop ? boundary.scrollMinTop : moveY;
                            moveY = moveY > boundary.scrollMaxTop ? boundary.scrollMaxTop : moveY;
                        }

                        _this._bar.css("top", moveY);
                        e.preventDefault();
                        _this.followElement(_this._box, _this._bar, _this.element, _this._child, parseInt(_this._box.css("top")), 0);
                    }, 200);
                }).on("mouseup", function(e) {
                    $(this).off("mousemove");
                    $(this).off("mouseup");
                });
            });
        },
        _mousewheel: function() {
            var _this = this;
            var _wheel = "mousewheel";
            if (!("onmousewheel" in document)) {
                _wheel = "DOMMouseScroll";
            };
            this.element.on(_wheel, function(e) {
                _this.throttle(function() {
                    var _delta = 1,
                        _event = e.originalEvent,
                        minTop = _this.options.height - _this._child.outerHeight();
                    e.preventDefault();
                    if (_event.wheelDelta) {
                        _delta = _event.wheelDelta / 120;
                    } else {
                        _delta = -_event.detail / 3
                    }
                    if (minTop > 0) {
                        _this._child.css("top", _this.options.top);
                        return;
                    }
                    var _top = parseInt(_this._child.css("top")) + _this.options.wheelStep * _delta;
                    _top = _top > _this.options.top ? _this.options.top : _top;
                    _top = _top < minTop ? minTop : _top;

                    _this._child.css("top", _top);

                    _this.followElement(_this.element, _this._child, _this._box, _this._bar, 0, parseInt(_this._box.css("top")));
                }, 200)
            });
        },
        // 生成节点
        reset: function() {
            var _this = this;
            var box = this.scrollBox(_this.options);
            var bar = this.scrollBar(_this.options);
            _this._box.appendTo(_this.element);
            _this._bar.appendTo(_this.element);
            if (_this.options.hover) this.hover();
            this._mousewheel();
            this.refresh();
        },
        // 移除节点
        remove: function() {
            if (_this._box) {
                _this._box.remove();
                _this._bar.remove();
            }
        }
    }

    $.fn.scroller = function(options) {
        var _arr = [];
        $(this[0]).each(function(i, t) {
            _arr.push(t);
        });
        var _element = $(_arr); // 这里需要做兼容性处理

        if (!options) return;

        return new scroller(_element, options);
    }

}(jQuery,window,document)
