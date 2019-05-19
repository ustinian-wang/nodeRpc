const rpc = require("./rpc");
const Server = rpc.Server;
const { RpcBuffer, Errno, ParamList } = rpc.base;

// 实现siteSvr
function SiteServer(options){
	this.server = new Server(options);
	this.svr = this.server.svr;
}
SiteServer.prototype = {
	constructor: SiteServer,
}

var siteSvr = new SiteServer({
	port: 8081,
	host: 'localhost',
	onProcess: function(recvProtocol, sendProtocol){
		var cmd = recvProtocol.getCmd();//要执行的命令

		//获取网站的数据
		if(cmd === 2){
			
			process_getSiteInfo(recvProtocol, sendProtocol);
	
		}else{
			result = Errno.ARGS_ERROR;
			sendProtocol.setResult(result);
		}
		
	}
});

var siteList = [
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

function process_getSiteInfo(recvProtocol, sendProtocol){
	var sendBuffer = new RpcBuffer();

	var aidValRef = {};
	var siteIdRef = {};
	recvProtocol.body.getInt({}, aidValRef);
	recvProtocol.body.getInt({}, siteIdRef);

	var result = Errno.OK;

	if(aidValRef.value && siteIdRef.value){

		var data = siteList.filter(function(data, index){
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