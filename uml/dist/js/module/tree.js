/**
 * tree 组件,用于拼装成可拖拽的数据库表组件
 * @param  bootstrap treeview js
 * @param  jQuery UI js
 * @return {tree[function]}       [组装完毕的数据库表函数]
 */
define(['bootstrap.treeview', 'pubSub'], function(bt) {
    return function(el,dragEl, data) {
        if (!el) return;

        var o = {
            init: function(el, data) {
                o.bt(el, data);
            },
            // 使用bootstrap treeview组件进行初始化
            bt: function(el, data) {
                var _tree = $(el).treeview({
                    data: data,
                    onRendered: function() {
                        o.drag();
                    }
                });
            },
            drag: function() {
                $(dragEl).draggable({
                    helper: "clone",
                    appendTo: ".artboard",
                    cursor:"move",
                    delay:"300",
                    distance:"10",
                    scope: "axis",
                    zIndex:10,
                    scroll: false
                });
            }
        }

        return o.init(el, data);
    };
});
