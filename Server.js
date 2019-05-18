/* 服务器通信 */
const net = require("net");

//协议
const Protocol = require("./Protocol.js");
const RpcBuffer = require("./RpcBuffer.js");
const ParamList = require('./ParamList.js');
const Package = require('./Package.js');
const Errno = require("./Errno.js");

const port = 8080;

const server = net.createServer();
// 当一个新连接被
server.on("connection", function(socket){
	console.log("connection");

	socket.on("close", function(had_error){
		//完全关闭就发出该事件。参数 had_error 是 boolean 类型，表明 socket 被关闭是否取决于传输错误。
		console.log("socket close", had_error);
	});
	
	socket.on("connect", function(){
		console.log("socket connect");
	});

	var recvPack = new Package();
	recvPack.onDataRecv(function(buffer){
		//这里是最终拿到的完整数据
		var sendProtocol = new Protocol();

		//获取数据的协议
		var recvProtocol = new Protocol();
		recvProtocol.recv(buffer);

		onProcess(recvProtocol, sendProtocol);

		var sendPackBuffer = new Package().pack(sendProtocol.send()); 
		//写消息回客户端
		socket.write(sendPackBuffer);		

	});

	socket.on("data", function(buffer){
		recvPack.putData(buffer);
	});

	socket.on("drain", function(){
		//写入缓冲区变为空时，触发
	});

	socket.on("end", function(){
		//socket发送fin包时，触发
		console.log("socket end");
	});

	socket.on("error", function(error){
		console.log("socket", error);
	});
	
});

//端口监听
server.listen(port);

//监听错误事件
server.on("error", function(error){
	console.log("server error", error);
});

// 开始监听端口
server.on("listening", function(){
	console.log("server listening", port);
});

// close
server.on("close", function(){
	console.log("server close");
});

var dbList = [
	{
		aid: 1, 
		siteId: 1,
		name: "wgd"
	},
	{
		aid: 2, 
		siteId: 3,
		name: "jser"
	},
	{
		aid: 4, 
		siteId: 5,
		name:"leao"
	},
];
function onProcess(recvProtocol, sendProtocol){
	var cmd = recvProtocol.getCmd();//要执行的命令

	//获取网站的数据
	if(cmd === 2){
		
		process_getSiteInfo(recvProtocol, sendProtocol);

	}else{
		result = Errno.ARGS_ERROR;
		sendProtocol.setResult(result);
	}

	sendProtocol.setFlow(recvProtocol.getFlow());//继承流水号，避免动作丢失
}

function process_getSiteInfo(recvProtocol, sendProtocol){
	var sendBuffer = new RpcBuffer();

	var aidValRef = {};
	var siteIdRef = {};
	recvProtocol.body.getInt({}, aidValRef);
	recvProtocol.body.getInt({}, siteIdRef);

	var result = Errno.OK;

	if(aidValRef.value && siteIdRef.value){

		var data = dbList.filter(function(data, index){
			return data.aid === aidValRef.value && data.siteId === siteIdRef.value;
		})[0];

		if(data){

			new ParamList([data]).toBuffer(sendBuffer, 1, {
				aid: 1,
				siteId: 2,
				name: 3
			});

		}

	}else{
		result = Errno.ARGS_ERROR;
	}

	//设置操作的返回结果
	sendProtocol.setResult(result);
	sendProtocol.addEncodeBody(sendBuffer);
}


