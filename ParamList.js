const Param = require("./Param.js");

function ParamList(dataList){
	this.list = Array.isArray(dataList) ? dataList : [];
}
ParamList.prototype = {
	constructor: ParamList,
	fromBuffer: function(buffer, keyRef, paramDef){
		var typeRef = {};
		buffer.decodeDef(keyRef, typeRef);//解码list的开始标签
		if(typeRef.value !== buffer.Type.GROUP_BEG){//如果不是开始标签，那么跳掉
			return;
		}

		this.decodeList(buffer, this.list, paramDef);
	},
	decodeList: function(buffer, list, paramDef){
		this.list.length=0;//先把list清空

		var typeRef = {};
		var keyRef = {};
		while(true){
			//解码下一个标签
			buffer.decodeDef(keyRef, typeRef);
			//如果是开始标签，说明分组已经结束了，不需要往下遍历list
			if(typeRef.value === buffer.Type.GROUP_END){
				return;
			}

			//如果是项的开始标签，那么解析项
			if(typeRef.value !== buffer.Type.GROUP_BEG){
				return null;
			}
			var obj = {};
			Param.prototype.decodeParam(buffer, obj, paramDef);

			this.list.push(obj);
		}

	},
	//写数据到buffer
	toBuffer: function(buffer, key, paramDef){
		//开始的标签
		buffer.encodeDef(key, buffer.Type.GROUP_BEG);

		this.list.forEach(function(data, index){
			new Param(data).toBuffer(buffer, index, paramDef);
		});

		//结束的标签
		buffer.encodeDef(key, buffer.Type.GROUP_END);
	}
};
module.exports = ParamList;


