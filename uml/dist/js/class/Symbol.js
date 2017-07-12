/**
 * symbols 类的组装与生成
 * @return {class}       [实体类]
 */
define(['klass','Entity'],function(klass,Entity){
    return klass(Entity,{
        porpertys:function($super){
            $super();
        },
        // 校验数据
        validateData:function(){
            return true
        },
        formatData:function(data){
            return data;
        },
        // 获取相关信息
        getData:function(){
            if(!this.validateData()){
                throw '数据结构有误'
            }
            return this.formatData(this.data);
        },
        getSign:function(){
            return this.sign;
        },
        getTpl:function(){
            return this.tpl;
        },
        renderTpl:function(tpl,data){
            if(!$.isFunction(tpl)) tpl = _.template(tpl);
            return tpl(data)
        }
    })
});
