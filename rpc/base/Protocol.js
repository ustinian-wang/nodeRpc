/* 自定义协议 
https://www.imooc.com/article/38126
{
	HEAD_LENGTH:头部的长度
	version: 协议版本号
	bodyLength: body的长度
	flow: 流水号
	cmd: 要执行的命令
	data: 携带的通信数据
	result: 执行的结果码

	functon int fn(args){}
	//方法名(cmd)、参数(data)、返回值(result)
}
*/
const RpcBuffer = require("./RpcBuffer.js");
const Errno = require("./Errno.js");

function Protocol(){
	this.head = new Head();
	this.body = new RpcBuffer();
}
Protocol.prototype = {
	constructor: Protocol,
	//通信的流水号
	getFlow: function(){
		return this.head.flow;
	},
	setFlow: function(flow){
		if(typeof(flow) === "number"){
			this.head.flow = flow;
		}
	},
	//命令
	getCmd: function(){
		return this.head.cmd;
	},
	setCmd: function(cmd){
		if(typeof(cmd) === "number"){
			this.head.cmd = cmd;
		}
	},
	getResult: function(result){
		return this.head.result;
	},
	setResult: function(result){
		if(typeof(result) === "number"){
			this.head.result = result;
		}
	},
	//添加编码后的buffer
	addEncodeBody : function(rpcBuffer){
		this.body.addBuffer(rpcBuffer);
		this.head.bodyLength+=rpcBuffer.length;
	},
	//接受数据
	recv: function(buffer){
		//复制拿过来的buffer，内部会保留对相同内存的引用

		//获取head的数据
		var headBuf = buffer.slice(0, this.head.HEAD_LENGTH);//截取头部的数据 
		//获取body数据
		var bodyBuf = buffer.slice(this.head.HEAD_LENGTH);//接收body的数据
		this.head.headBuf = headBuf;
		//对头部进行解码
		this.head.decode();

		this.body = new RpcBuffer(bodyBuf);
	},
	//发送数据
	send: function(){
		this.head.encode();//对头部进行并编码处理

		//把当前协议里面的数据聚合成buf发送出去
		var totalLength = (this.head.HEAD_LENGTH+this.body.length);
		var buffer = Buffer.concat([this.head.headBuf, this.body.buf], totalLength);
		return buffer;
	}
};


function Head(){
	this.VERSION = 0;//版本号(1)
	this.HEAD_LENGTH = 32;//头部的长度(1)-固定值
	this.bodyLength = 0;//body的长度(4)
	this.cmd = 0;//要执行的命令(1)
	this.flow = 0;//流水号(4)
	this.result = 0;//处理结果(1)

	this.headBuf = Buffer.alloc(this.HEAD_LENGTH);//头部使用的buf
}
Head.prototype = {
	constructor: Head,
	encode: function(){//把head的数据，聚合成buf
		//把head的数据写入buffer
		var buffer = Buffer.alloc(this.HEAD_LENGTH);
		var offset = 0;
	
		//固定数据		
		buffer.writeUInt8(this.VERSION, offset);offset++;
		buffer.writeUInt8(this.HEAD_LENGTH, offset);offset++;
		buffer.writeUInt32BE(this.bodyLength, offset);offset+=4;
		buffer.writeUInt8(this.cmd, offset);offset+=1;
		buffer.writeUInt32BE(this.flow, offset);offset+=4;
		buffer.writeUInt8(this.result, offset);offset+=1;
		this.headBuf = buffer;
	},
	decode: function(){//对head的buf做解码，初始化head的属性
		var buffer = this.headBuf;
		var offset = 0;

		//做校验，然后返回校验的布尔值
		//固定数据
		var version = buffer.readUInt8(offset);offset+=1;
		if(version !== this.VERSION){
			return Errno.ERROR;
		}
		

		var headLength = buffer.readUInt8(offset);offset+=1;
		if(headLength !== this.HEAD_LENGTH){
			return Errno.ERROR;
		}

		//可变数据
		var bodyLength = buffer.readUInt32BE(offset);offset+=4;
		var cmd = buffer.readUInt8(offset);offset+=1;
		var flow = buffer.readUInt32BE(offset);offset+=4;
		var result = buffer.readUInt8(offset);offset+=1;

		//初始化head
		this.bodyLength = bodyLength;
		this.cmd = cmd;
		this.flow = flow;
		this.result = result;

		return Errno.OK;
	}
};

module.exports = Protocol;

/*(function TestCase(){

	var CMD_GET_INFO = 9;
	var flow = 6666;
	//准备好要发送过去的参数
	var argBuffer = new RpcBuffer();
	argBuffer.putString(1, '王广铎');
	argBuffer.putInt(2, -8);//年龄
	argBuffer.putBoolean(3, true);//单身

	//要用于发送的协议
	var sendProtocol = new Protocol();
	//流水号
	sendProtocol.setFlow(6666);
	//命令
	sendProtocol.setCmd(CMD_GET_INFO);
	//参数
	sendProtocol.addEncodeBody(argBuffer);

	var sendBuffer = sendProtocol.send();

	//接收数据的协议
	var recvProtocol = new Protocol();
	recvProtocol.recv(Buffer.from(sendBuffer));

	var recvBodyBuffer = recvProtocol.body;

	var oneKeyRef = {};
	var oneValRef = {};

	var twoKeyRef = {};
	var twoValRef = {};

	var threeKeyRef = {};
	var threeValRef = {};

	recvBodyBuffer.getString(oneKeyRef, oneValRef);
	recvBodyBuffer.getInt(twoKeyRef, twoValRef);
	recvBodyBuffer.getBoolean(threeKeyRef, threeValRef);

	console.log(recvProtocol);
	console.log(oneKeyRef, oneValRef);
	console.log(twoKeyRef, twoValRef);
	console.log(threeKeyRef, threeValRef);
}());*/

