const rpc = require("./rpc");
const Client = rpc.Client;
const { Protocol, RpcBuffer, ParamList } = rpc.base;

function SiteCli(){
}
SiteCli.prototype = {
	constructor: SiteCli,
	getSiteInfo: async function(aid, siteId){
        //业务数据
		var flow = 996;
		var sendBuffer = new RpcBuffer();
		sendBuffer.putInt(1, aid);//aid
		sendBuffer.putInt(2, siteId);//siteId

		var sendProtocol = new Protocol();
		sendProtocol.setCmd(2);
		sendProtocol.setFlow(flow);
		sendProtocol.addEncodeBody(sendBuffer);
        //只要返回值是promise，就可以用await，往下的代码就像嵌入then回调中
        const recvProtocol = await this.create().send(sendProtocol);

        var list = new ParamList();
        list.fromBuffer(recvProtocol.body, {}, {
            aid: 1,
            siteId: 2,
            name: 3
        });

        if(list.list.length === 0){
            return;
        }

        return list.list[0];
    },
    create: function(){
        return new Client({
            port: 8081
        });
    }
};


async function run(){
    
    var siteCli = new SiteCli(); 
    const siteInfo = await siteCli.getSiteInfo(2, 3);//await只能出现在async函数内部
    console.log(siteInfo);
}

run();  