const net = require("net");

const port = 8080;

const { Protocol, Package } = require("./base");

function Client(options){
	this.serverConfig = Object.assign({
		host: '',
		port: 0
	},  options);
}
Client.prototype = {
	constructor:Client,
	send: function(sendProtocol){
		var $self = this;
		return new Promise(function(resolve, reject){
			/*socket的生命周期是怎么样的？*/
			//创建套接字
			const socket = net.createConnection($self.serverConfig);

			socket.on("connect", function(){
				var sendBuffer = sendProtocol.send();//把协议里面的buffer拿出来发送;

				//确实需要package处理粘包问题
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


module.exports = Client;