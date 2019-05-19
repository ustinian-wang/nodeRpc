const Var = require("./Var.js");

function Param(data){
	this.o = Object.assign({}, data);
}
//把buffer写入param
Param.prototype = {
	constructor: Param,
	// 把数据写入buffer
	toBuffer: function(buffer, key, paramDef){
		buffer.encodeDef(key, buffer.Type.GROUP_BEG);

		var $self = this;
		Object.keys(paramDef).forEach(function(paramKey, index){
			var defVal = paramDef[paramKey];
			var value  = $self.o[paramKey];

			new Var().toBuffer(buffer, defVal, value);
		});

		buffer.encodeDef(key, buffer.Type.GROUP_END);
	},
	//从buffer获取数据
	fromBuffer: function(buffer, keyRef, paramDef){
		
		//然后对param赋值
		var typeRef = {};
		buffer.decodeDef(keyRef, typeRef);
		if(typeRef.value !== buffer.Type.GROUP_BEG){
			return null;
		}

		this.decodeParam(buffer, this.o, paramDef);
	},
	decodeParam: function(buffer, param, paramDef){
		//清空属性引用
		Object.keys(param).forEach(function(key){
			delete param[key];
		});


		var typeRef = {};
		var paramKeyRef = {};

		var data = {};
		while(true){
			//key-type
			//key-value
			
			/*
			putInt:function(key, value){
				encodeDef(key, intDef);
				encodeVarint(value);
			}
			putInt(key, type);
			putInt(key, value);
			 */
			
			//获取key-type
			buffer.decodeDef(paramKeyRef, typeRef);//获取键的类型
			
			if(typeRef.value === buffer.Type.GROUP_END){

				Object.entries(paramDef).forEach(function(kv){
					var paramDefKey = kv[0];
					var paramDefVal = kv[1];
					param[ paramDefKey ] = data[ paramDefVal ];
				});

				return;
			}

			var valueRef = {};

			new Var().decodeValue(buffer, valueRef);//把value解析出来

			//把值赋到param上，完成对象的解析
			data[paramKeyRef.value] = valueRef.value;
			
		}
	}
};

module.exports = Param;