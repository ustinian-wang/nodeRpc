const net = require("net");

const port = 8080;

const Protocol = require("./Protocol.js");
const RpcBuffer = require("./RpcBuffer.js");
const ParamList = require('./ParamList.js');
const Package = require('./Package.js');
/*var siteCli = new SiteClient();
var siteInfo = null;
siteCli.getSiteInfo(aid, siteId, function(info){
	siteInfo = info
});*/


/*siteCli.getSiteInfo()
	.then(function(){})
	.catch(function(){});*/

function Client(){
	this.serverConfig = null;
	this.init();
}
Client.prototype = {
	constructor:Client,
	init: function(){
		this.serverConfig = {
			port: 8080,
			// host: 'localhost'
		};
	},
	//promise的jiekou
	send: function(sendProtocol){
		var $self = this;
		return new Promise(function(resolve, reject){
			/*socket的生命周期是怎么样的？*/
			//创建套接字
			const socket = net.createConnection($self.serverConfig);

			socket.on("connect", function(){
				var sendBuffer = sendProtocol.send();//把协议里面的buffer拿出来发送;

				var sendPack = new Package();

				var sendPackBuf = sendPack.pack(sendBuffer);
				
				socket.write(sendPackBuf);
			});

			var recvPack = new Package();
			recvPack.onDataRecv(function(buffer){
				//把断断续续的buffer组装完成
				
				//有数据过来
				
				var recvProtocol = new Protocol();
				recvProtocol.recv(buffer);

				resolve(recvProtocol);
				socket.end();//结束
			});

			socket.on("data", function(buffer){
				recvPack.putData(buffer);
			});

			socket.on("error", function(error){
				console.log("socket error", error);
				reject(error);

				socket.end();
			});

			socket.on("drain", function(){
				//写入缓冲区变为空时，触发
			});

			socket.on("end", function(){
				//socket发送fin包时，触发
				console.log("socket end");

			});

			/* 客户端请求 */
			socket.on("close", function(had_error){
				//完全关闭就发出该事件。参数 had_error 是 boolean 类型，表明 socket 被关闭是否取决于传输错误。
				console.log("socket close", had_error);
			});
		});
	}
};

function SiteClient(){

}
SiteClient.prototype = {
	constructor: SiteClient,
	getSiteInfo: function(aid, siteId){

		var flow = 996;

		var sendBuffer = new RpcBuffer();
		sendBuffer.putInt(1, aid);//aid
		sendBuffer.putInt(2, siteId);//siteId

		var sendProtocol = new Protocol();
		sendProtocol.setCmd(2);
		sendProtocol.setFlow(flow);
		sendProtocol.addEncodeBody(sendBuffer);


		//发送数据
		return new Client().send(sendProtocol).then(function(recvProtocol){
			
			//解析协议里面的数据
			if(recvProtocol.getFlow() !== flow){
				console.log("流水号不匹配");
			}

			var list = new ParamList();
			list.fromBuffer(recvProtocol.body, {}, {
				aid: 1,
				siteId: 2,
				name: 3
			});
			console.log(list);

		});
	}
};

new SiteClient().getSiteInfo(2, 3).then(function(info){
	console.log("info",info);
}, function(err){
	console.log(err);
});