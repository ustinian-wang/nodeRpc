//对二进制数据进行打包
function Package(){
	this.length = 0;//包裹的长度
	this.firstPuted = true;
	this.recvHandler = null;
	this.packBuf = null;

	this.running = true;
}
Package.prototype = {
	constructor: Package,
	putData: function(buffer){
		//初始化空间，存储buffer内容
		if(this.firstPuted){
			var contentLen = buffer.readUInt32BE(0);
			this.packBuf = Buffer.alloc(4+contentLen);
			this.firstPuted = false;
		}

		buffer.copy(this.packBuf, this.length);
		this.length+=buffer.length;

		var $self = this;

		$self.running = true;
		process.nextTick(function(){
			if($self.running){
				$self._onDataRecv();
			}
		});
	},
	onDataRecv: function(recvHandler){
		this.recvHandler = recvHandler;
	},
	_onDataRecv: function(){
		console.log("triger", this.checkRecv());
		if(this.recvHandler && this.checkRecv()){
			this.recvHandler(this.packBuf.slice(4));
			this.running = false;
		}
	},
	//检查是否接收完成
	checkRecv: function(){
		//还没有数据进来
		if(this.packBuf === null || this.packBuf.length < 4){
			return false;
		}

		var contentLen = this.packBuf.readUInt32BE(0);
		var recvLen = this.packBuf.slice(4).length;
		if(contentLen !== recvLen){
			return false;
		}
		if(this.length != (recvLen+4)){
			return false;
		}

		return true;
	},
	pack: function(buffer){
		var bufferLength = buffer.length;
		//用4个字节记录buf的长度
		var packBuf = Buffer.alloc(buffer.length+4);
		packBuf.writeUInt32BE(bufferLength, 0);//记录
		buffer.copy(packBuf, 4);
		return packBuf;		
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


});