define([], function() {
    /**
     * 深度搜索,dfs,解两点之间所有路径
     * @param  {[type]} v [description]
     * @return {[type]}   [description]
     */
    return function(v) {
        var _this = this;

        this.vertices = v; // 总顶点
        this.edges = 0; //图的起始边数
        this.adj = []; //内部邻接表表现形式
        this.marked = []; // 内部顶点访问状态,与邻接表对应
        this.path = []; // 路径表示
        this.lines = []; // 所有路径汇总

        for (var i = 0; i < this.vertices; ++i) {
            _this.adj[i] = [];
        }

        /**
         * 初始化访问状态
         * @return {[type]} [description]
         */
        this.initMarked = function() {
            for (var i = 0; i < _this.vertices; ++i) {
                _this.marked[i] = false;
            }
        };

        /**
         * 在邻接表中增加节点
         * @param {[type]} v [description]
         * @param {[type]} w [description]
         */
        this.addEdge = function(v, w) {
            this.adj[v].push(w);
            this.edges++;
        };

        /**
         * 返回生成的邻接表
         * @return {[type]} [description]
         */
        this.showGraph = function() {
            return this.adj;
        };

        /**
         * 深度搜索算法
         * @param  {[type]} v    [起点]
         * @param  {[type]} d    [终点]
         * @param  {[type]} path [路径]
         * @return {[type]}      [description]
         */
        this.dfs = function(v, d, path) {
            var _this = this;

            this.marked[v] = true;
            path.push(v);

            if (v == d) {
                var arr = [];
                for (var i = 0; i < path.length; i++) {
                    arr.push(path[i]);
                }

                _this.lines.push(arr);
            } else {
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = this.adj[v][Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var w = _step.value;

                        if (!_this.marked[w]) {
                            _this.dfs(w, d, path);
                        }
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return) {
                            _iterator.return();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }
            }

            path.pop();
            this.marked[v] = false;
        };

        this.verify = function(arr, start, end) {

            if (!_.isArray(arr)) {
                end = start;
                start = arr;
                arr = [];
                this.lines = [];
                this.path = [];
            }

            this.initMarked();

            for (var i = 0; i < arr.length; i++) {
                _this.addEdge(arr[i].from, arr[i].to);
            }

            this.dfs(start, end, this.path);
            return this.lines;
        };
    }
});
