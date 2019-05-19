/* 服务器通信 */
const net = require("net");

//协议
const { Protocol, Package } = require("./base");
//创建svr
function Server(options){
	var defaultOptions = {
		port: 0,
		host: '',
		onProcess: function(recvProtocol, sendProtocol){}
	};
	this.options = Object.assign({}, defaultOptions, options);

	this.svr = this.create();
	this.run();

}
Server.prototype = {
	constructor: Server,
	create: function(){

		$self = this;

		//整套创建svr的流程
		const server = net.createServer({
			host: this.options.host,
			port: this.options.port
		});

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

				//处理协议通信
				$self.options.onProcess(recvProtocol, sendProtocol);

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


		//监听错误事件
		server.on("error", function(error){
			console.log("server error", error);
		});

		// 开始监听端口
		server.on("listening", function(){
			console.log("server listening", this.address().port);
		});

		// close
		server.on("close", function(){
			console.log("server close");
		});

		return server;
	},
	run: function(){
		this.svr.listen(this.options.port);
	}
};

module.exports = Server;