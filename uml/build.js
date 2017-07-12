({
    appDir: './',
    baseUrl: './dist',
    dir: './build',
    optimize: 'uglify',
    modules: [{
        name: 'main'
    }],
    fileExclusionRegExp: /^(r|build)\.js$/,
    optimizeCss: 'standard',
    removeCombined: true,
    paths: {
        // require plugins
        'text': 'lib/require.text',
        'textPath': 'js/tpl',
        // bootstrap and plugins
        'bootstrap': '../plugins/bootstrap/js/bootstrap.min',
        'bootstrap.treeview': '../plugins/bootstrap-treeview/bootstrap-treeview.min',
        'bootstrap.contextmenu': '../plugins/bootstrap-contextmenu/bootstrap-contextmenu',
        // axis plugins
        'scrollBar': '../plugins/scrollBar/axis.scrollBar',
        // class
        'Entity': 'js/class/Entity',
        'Symbol': 'js/class/Symbol', // 可复用单元类
        // dao
        'middleWare': 'js/dao/middleWare',
        'pubSub': 'js/dao/pubSub',
        'klass': 'js/dao/klass',
        'request': 'js/dao/request',
        'mt': 'js/dao/mt',
        'graph': 'js/dao/graph',
        'throttle': 'js/dao/throttle',
        // module 组装而成的组件
        'tree.module': 'js/module/tree',
        'symbols': 'js/module/symbols',
        'artboardUml': 'js/module/artboardUml',
        'artboardFlow': 'js/module/artboardFlow',
        'contextmenu': 'js/module/contextmenu',
        'jsplumb': 'js/module/jsplumb',
        'modal': 'js/module/modal',
        'resize': 'js/module/resize',
        'mutation': 'js/module/mutation',
        // app
        'UML': 'js/uml',
        'FLOW': 'js/flow'
    }
})
