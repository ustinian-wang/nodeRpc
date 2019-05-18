const Param = require("./Param.js");
const ParamList = require("./ParamList.js");
const Var = require("./Var.js");

//构造协议专用的buffer 
function RpcBuffer(buf){
	//默认分配1K
	this.buf= buf ? buf : Buffer.alloc(this.DEFAULT_LENGTH);
	this.length = buf?buf.length:0;
	this.cursor = 0;
}
/*
+----+----+----+----+----+----+----+----+----+----+----+----+----+----+
| 键1     |  值1的类型   |  值1    | 键2     |  值2的类型   |  值2    | 
+----+----+----+----+----+----+----+----+----+----+----+----+----+----+
 */
RpcBuffer.prototype = {
	constructor: RpcBuffer,
	Type: {
		VARINT: 0,
		VARLONG: 1,
		LEN_BYTES: 2,
		GROUP_BEG: 3,
		GROUP_END: 4
	},
	DEFAULT_LENGTH:1024,
	encodeDef: function(key, type){
		this.encodeVarint((key<<3) | type);//左移3位，写入key+type的值
	},
	// int相关操作
	putInt: function(key, value){
		//先放入key
		this.encodeDef(key, this.Type.VARINT);
		//然后放入value
		this.encodeVarint(value);
	},
	putDouble: function(key, value){
		this.autoExtCapacity(this.length+8);

		this.encodeDef(key, this.Type.VARINT);
		this.buf.writeDoubleBE(value, this.length);
		this.length+=8;//8个字节
	},
	encodeVarint: function(value){
		this.autoExtCapacity(this.length+5);
		//最多用到5个byte，32int+3位type

		// 1111 1111 1111 1111
		//            111 1111( b = value && 0x7f )
		//           1000 0000( b=b|0x80 )   
		//计算方式（数据从左往右放）
		var b = 0;
		//_  	_ _ _ _  	_ _ _
		//m   field_number    type
		while(true){
			//取后面7位
			b = value & 0x7f;//通过与运算获取  111 1111取低7位
			value >>>= 7;//value无符号右移7位

			//要用无符号的API，为了支持负数运算
			
			if(value === 0){//没有数据需要存储，最高为置为0
				this.buf.writeUInt8(b, this.length);//最高位为0
				this.length+=1;//累加1byte
				break;
			}else{
				b = (b | 0x80);
				this.buf.writeUInt8(b, this.length);//最高位为1
				this.length+=1;
			}			
		}
		// _ _ _ _ _ _ _ _   _ _ _ _ _ _ _ _   _ _ _ _ _ _ _ _
		// [0 				 1  			   1		][type]
	},

	getInt: function(keyRef, valueRef){
		var typeRef = {};
		this.decodeDef(keyRef, typeRef);
		if(typeRef.value !== this.Type.VARINT){
			return null;
		}

		return this.decodeVarint(valueRef);
	},
	getDouble: function(keyRef, valRef){
		var typeRef = {};
		this.decodeDef(keyRef, typeRef);
		if(typeRef.value !== this.Type.VARINT){
			return null;
		}
		this.decodeDouble(valRef);
	},
	decodeDouble: function(valRef){
		valRef.value = this.buf.readDoubleBE(this.cursor);
		this.cursor+=8;
	},
	decodeDef: function(keyRef, typeRef){
		var def = {};
		this.decodeVarint(def);

		keyRef.value = def.value >>> 3;//无符号右移3位，取出原先的field_number

		typeRef.value = def.value & 0x7;
	},
	decodeVarint: function(valueRef){
		this.autoExtCapacity(this.length+5);
		//int最多4个byte，外加3位type，最大5个byte
		valueRef.value = 0;
			
		var b = 0;
		for(var i=0; i<5;++i){
			b = this.buf.readUInt8(this.cursor);//读取一个
			this.cursor++;

			valueRef.value =  valueRef.value | ( (b&0x7f) << (7*i));//形成高位

			//读取到尽头高位===0
			if(b>>>7 === 0){
				return;
			}
		}

	},

	// 字符相关操作
	putString: function(key, value){
		this.encodeDef(key, this.Type.LEN_BYTES);
		this.encodeString(value);
	},
	encodeString: function(string){
		this.encodeLenBytes(string);
	},
	encodeLenBytes: function(string){

		// const string_decoder = require("string_decoder");
		// var String_Decoder = string_decoder.String_Decoder("utf8");

		var stringBuf = Buffer.from(string, "utf8");//把string构造成buffer，为了方便存储中文，牺牲性能
		var len = stringBuf.length;

		this.autoExtCapacity(this.length+len);

		//把长度记录下来
		this.encodeVarint(len);//用若干字节，记录写入字符串的长度，便于后续提取字符串的值
			
		//把stringBuf 拷贝到this.buf中的某个区域
		stringBuf.copy(this.buf, this.length);
		//this.buf.write(string, this.length, len, "utf8");//记录字符串的值到buf
		this.length+=len;//累加长度
	},
	decodeString: function(valueRef){
		var len = 0;//获取字符串的长度
		this.cursor;//当前的游标地址

		var v = {value:0};
		this.decodeVarint(v);
		len = v.value;
		var strBuf = this.buf.slice(this.cursor, this.cursor+len);//api对字符串值提供slice接口
		valueRef.value = strBuf.toString("utf8");//utf8下，一个中文占3个字节
		this.cursor+=len;
	},
	decodeLenBytes: function(){},
	getString: function(keyRef, valueRef){
		var typeRef = {};
		//解析类型
		this.decodeDef(keyRef, typeRef);
		if(typeRef.value !== this.Type.LEN_BYTES){
			return null;
		}
		//解析值
		return this.decodeString(valueRef);
	},
	putBoolean: function(key, value){
		//先放入key
		this.encodeDef(key, this.Type.VARINT);
		//然后放入value
		this.encodeVarint(value?1:0);
	},
	getBoolean: function(keyRef, valueRef){
		var typeRef = {};

		this.decodeDef(keyRef, typeRef);
		if(typeRef.value !== this.Type.VARINT){
			return null;
		}

		this.decodeVarint(valueRef);
		valueRef.value = (valueRef.value == 1);
	},
	autoExtCapacity: function(length){
		//容器不够的情况下自动扩容
		if(this.buf.length<length){
			var newBuffer = Buffer.alloc(this.buf.length+this.DEFAULT_LENGTH);//再扩充一下空间
			this.buf.copy(newBuffer);
			this.buf = newBuffer;
		}
	},
	addBuffer: function(rpcBuffer){
		var len = rpcBuffer.length;	
		var buf = rpcBuffer.buf;
		//对空间进行扩容
		this.autoExtCapacity(this.length+len);
		//把数据拷贝过去
		buf.copy(this.buf, this.length);
		this.length+=len;
	}
};

module.exports = RpcBuffer;


// 测试用例
(function TestCase(){


	/*var buf = new RpcBuffer();

	var strKeyRef = {value: 0};
	var strValRef = {value: ''};
	var oneKeyRef = {value:0};
	var oneValueRef = {value: 0};
	var twoKeyRef = {value:0};
	var twoValueRef = {value: 0};
	var booleanKeyRef = {value:0};
	var booleanValueRef = {value: 0};

	var objKeyRef = {};
	var objValRef = {};
	var objDef = {
		aid:0,
		siteId:1,
		name: 2,
		floatVal: 3
	};

	var param = new Param({
		aid: true,
		siteId: 129,
		name: "wgd",
		floatVal: 6.6
	});
	param.toBuffer(buf, 1, objDef);

	var param2 = new Param({});
	param2.fromBuffer(buf, objKeyRef, objDef);
	console.log(buf.length);//29
	console.log(JSON.stringify({
		aid: true,
		siteId: 129,
		name: "wgd",
		floatVal: 6.6
	}).length);//53*/


	/*var buf = new RpcBuffer();
	var list = new ParamList([

		{
			aid: 11111,
			siteId: 1111,
			name: "wgd",
			floatVal: 1111
		},

		{
			aid:2222,
			siteId: 2222,
			name: "wgd",
			floatVal:2222
		}
	]);
	var objDef = {
		aid:0,
		siteId:1,
		name: 2,
		floatVal: 3
	};
	list.toBuffer(buf, 1, objDef);

	var list2 = new ParamList();
	var list2KeyRef = {};
	list2.fromBuffer(buf, list2KeyRef, objDef);
	*/


	/*//定义obj的字段索引值
	var objDef = {
		aid:0,
		siteId:1,
		name: 2,
		isMan: 3,
		money: 4,
	};

	var dataParam = new Param({
		aid: 1,
		siteId: 2,
		name: 'wgd',
		isMan: true,
		money: 300.5
	});

	var listObjDef = {
		id: 1,
		name: 2,
		value: 3
	};

	var paramList = new ParamList([
		{
			id: 1,
			name: 'wgd',
			value: 666	
		},
		{
			id:2 ,
			name: "jser",
			value: 7777
		}
	]);

	var pBuf = new RpcBuffer();
	pBuf.putInt(1, 1);
	dataParam.toBuffer(pBuf, 2, objDef);
	pBuf.putString(3, "我是广铎");
	pBuf.putDouble(4, 2.3333);
	paramList.toBuffer(pBuf, 5, listObjDef);
	pBuf.putBoolean(6, true);

	var oneKeyRef = {};
	var oneValueRef = {};
	pBuf.getInt(oneKeyRef, oneValueRef);
	console.log(oneKeyRef, oneValueRef);

	var twoParam = new Param();
	var twoKeyRef = {};
	twoParam.fromBuffer(pBuf, twoKeyRef, objDef);
	console.log(twoKeyRef, twoParam.o);

	var threeKeyRef = {};
	var threeValRef = {};
	pBuf.getString(threeKeyRef, threeValRef);
	console.log(threeKeyRef, threeValRef);

	var fourKeyRef = {};
	var fourValRef = {};
	pBuf.getDouble(fourKeyRef, fourValRef);
	console.log(fourKeyRef, fourValRef);

	var fiveKeyRef = {};
	var fiveParamList = new ParamList();
	fiveParamList.fromBuffer(pBuf, fiveKeyRef, listObjDef);
	console.log(fiveKeyRef, fiveParamList.list);

	var sixKeyRef = {};
	var sixvalRef = {};
	pBuf.getBoolean(sixKeyRef, sixvalRef);
	console.log(sixKeyRef, sixvalRef);*/


	// 粘包的处理场景，因为socket中一次通信，
	
}());