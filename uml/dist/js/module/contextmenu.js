/**
 * contextmenu 组件
 * @param  bootstrap contextmenu js
 * @return {contextmenu[function]}       [description]
 */
define([
    'text!textPath/tpl.contextmenu.html',
    'bootstrap.contextmenu',
    'modal'
], function(cmTpl, bc, modal) {

    var contextmenu = function(type,scope) {
        this.type = type;
        this.scope = scope;
        this.init();
    };

    contextmenu.prototype = {
        init: function() {
            this.setLayout();
        },
        setLayout: function() {
            var _this = this;

            switch (this.type) {
                case "artboard":
                    _this.artboardInit();
                    break;
                case "":
                    break;
            }
        },
        artboardInit: function() {
            var _this = this;

            /*$(".artboard").keydown(function(event){
                console.log(event);
                if(event.ctrlKey){
                    switch(event.keyCode){
                        case 78:
                            console.log("这是新建");
                            break;
                    }
                }
            });
*/        },
        artboardType: function(type) {
            var _this = this;


        }
    };

    return contextmenu;
});
