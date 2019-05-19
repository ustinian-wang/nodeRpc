//对二进制数据进行打包
function Package(){
	this.packLen = 0;//包裹的长度
	this.recvHandler = null;//接受完成事件
	this.packBuf = null;//数据容器
}
//预留32位记录buffer的长度，最大记录4G，buffer在64位机上存储2G内存
Package.prototype = {
	constructor: Package,
	putData: function(packSliceBuf){
		//初始化空间，存储buffer内容
		if(!this.packBuf){
			this.init(packSliceBuf);
		}
		//把数据碎片内容写入容器中
		packSliceBuf.copy(this.packBuf, this.packLen);
		this.packLen+=packSliceBuf.length;//记录接收数据的长度

		//如果有函数回调注入，然后检查正常，出发接受完毕事假
		if(this.recvHandler && this.checkRecv()){
			this.recvHandler(this.unPack(this.packBuf));
		}
	},
	init: function(firstPackSlickBuf){
		var contentLen = firstPackSlickBuf.readUInt32BE(0);
		this.packBuf = Buffer.alloc(4+contentLen);
	},
	onDataRecv: function(recvHandler){
		this.recvHandler = recvHandler;
	},
	//检查是否接收完成
	checkRecv: function(){
		//还没有数据进来
		if(this.packBuf === null || this.packBuf.length < 4){
			return false;
		}
		//内容还没接收完
		var contentLen = this.packBuf.readUInt32BE(0);
		if(contentLen !== this.packLen-4){
			return false;
		}

		return true;
	},
	//对过来的buffer进行打包
	pack: function(buffer){
		var bufferLength = buffer.length;
		//用4个字节记录buf的长度
		var packBuf = Buffer.alloc(buffer.length+4);
		packBuf.writeUInt32BE(bufferLength, 0);//记录
		buffer.copy(packBuf, 4);
		return packBuf;		
	},
	//对打包后的buffer进行解包
	unPack: function(packBuf){
		var buffer = packBuf.slice(4);
		return buffer;
	}
};
module.exports = Package;

(function TestCase(){
	var string = "哈啊圣诞快乐罚款斯蒂芬拉丝粉阿萨德发射点发";
	var strBuf = Buffer.from(string);

	var packageBuffer = new Package().pack(strBuf);
	console.log(strBuf.length, packageBuffer.length);
	var pack = new Package();

	var buf1 = packageBuffer.slice(0, 10);
	var buf2 = packageBuffer.slice(10, 15);
	var buf3 = packageBuffer.slice(15);

	pack.onDataRecv(function(buf){
		console.log(buf.toString("utf8"));
	});
	pack.putData(buf1);
	pack.putData(buf2);
	pack.putData(buf3);

}());