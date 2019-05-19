function Var(){

}
Var.prototype = {
	constructor: Var,
	Type: {
		UNKNOW : -1,
		BOOLEAN: 0,
		NUMBER: 1,
		STRING: 2,
		DOUBLE: 3
	},
	//获取对应的类型
	getType: function(value){
		if(typeof(value) === "string"){
			return this.Type.STRING;
		}else if(typeof(value) === "boolean"){
			return this.Type.BOOLEAN;
		}else if(typeof(value) === "number" && Number.isInteger(value)){
			return this.Type.NUMBER;
		}else if(typeof(value) === "number" && !Number.isInteger(value)){
			return this.Type.DOUBLE;
		}

		return this.UNKNOW;
	},
	//key-type, key-value;
	toBuffer: function(buffer, key, value){
		//得到值的类型
		var valueType = this.getType(value);
		//把值解析进入buffer
		switch(valueType){
			case this.Type.BOOLEAN:
				buffer.putInt(key, valueType);
				buffer.putBoolean(key, value);
				break;
			case this.Type.NUMBER:
				buffer.putInt(key, valueType);
				buffer.putInt(key, value);
				break;
			case this.Type.STRING:
				buffer.putInt(key, valueType);
				buffer.putString(key, value);
				break;
			case this.Type.DOUBLE:
				buffer.putInt(key, valueType);
				buffer.putDouble(key, value);
		}
	},
	//把buffer里面的变量值解析出来
	decodeValue: function(buffer, valRef, valDef){//valDef描述，如果解析出来的是一个object，需要怎样的格式
		
		/*
		putInt: function(key, value){
			encodeDef(key, this.Type);
			encodeVaring(value)
		}
		put(1-key, 2-valueType);
		put(3-key, 4-value);

		//外部已经执行了1-key的步骤

		这里需要执行2、3、4的步骤
		 */

		//获取value的类型
		var typeRef = {};
		buffer.decodeVarint(typeRef);

		//获取value的类型
		var keyRef = {};
		var keyTypeRef= {};
		buffer.decodeDef(keyRef, keyTypeRef);

		//获取value的值
		if(typeRef.value === this.Type.BOOLEAN && keyTypeRef.value === buffer.Type.VARINT){
			var valueRef = {};
			buffer.decodeVarint(valueRef);
			valRef.value = ( valueRef.value === 1 ? true : false ) ;
		}else if(typeRef.value === this.Type.NUMBER && keyTypeRef.value === buffer.Type.VARINT){
			buffer.decodeVarint(valRef);
		}else if(typeRef.value === this.Type.STRING && keyTypeRef.value === buffer.Type.LEN_BYTES){
			buffer.decodeString(valRef);
		}else if(typeRef.value === this.Type.DOUBLE && keyTypeRef.value === buffer.Type.VARINT){
			buffer.decodeDouble(valRef);
		}
	}
};
module.exports = Var;