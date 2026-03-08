import { readFile,readdir } from 'node:fs/promises'
import { dirname,join } from 'node:path'
import { fileURLToPath } from 'url';

//const __filename = fileURLToPath(import.meta.url); // 当前文件绝对路径
// const __dirname = dirname(__filename);             // 当前文件所在目录
// const dataDir = path.join(path.dirname(path.dirname(__dirname)), 'data/f10');   // 获取上两级目录

function removeExtension(filename) {
  const lastDotIndex = filename.lastIndexOf(".");
  return lastDotIndex === -1 ? filename : filename.slice(0, lastDotIndex);
}

function convertFZDate(dayNum){
    let year = Math.floor(dayNum / 2048) + 2004; 
    dayNum = dayNum % 2048;
    let month = Math.floor(dayNum / 100);
    let day = dayNum % 100;
    return (year*10000 + month*100 + day);
}


// SFTP 连接配置
class TDX_Reader {
  constructor(tdxroot) {
    this.tdx_root = tdxroot;
    console.log("tdx_root:", this.tdx_root);
  }

  //   字节位置	数据类型	说明	转换公式
  // 0-3	uint32	日期(YYYYMMDD)	直接读取
  // 4-7	uint32	开盘价(×100)	/100
  // 8-11	uint32	最高价(×100)	/100
  // 12-15	uint32	最低价(×100)	/100
  // 16-19	uint32	收盘价(×100)	/100
  // 20-23	float	成交额(元)	直接读取
  // 24-27	uint32	成交量(股)	/100得到手数(1手=100股)
  // 28-31	uint32	上日收盘价(×100)	/100
  /* 远程读取通达信bj sh sz lday文件夹下的名字, 提取股票代码返回
   * @param {object} -sftp 已经连接上的ssh-sftp client
  * @param {string} -code 代码，如'sh999999'
   * @returns { array } - records, code的所有日期数据
   */
  async readToDate_TDXDay(code, date=39991231) {
    const filePath = join(this.tdx_root, "vipdoc", code.substring(0, 2), "lday", `${code}.day`);
    try {
      const buffer = await readFile(filePath);
      // 更严格的文件验证
      if (buffer.length === 0) {
        return []; // 空文件返回空数组
      }
      if (buffer.length % 32 !== 0) {
        throw new Error(`文件长度(${buffer.length})不是32的整数倍，可能已损坏`);
      }

      const recordCount = buffer.length / 32;
      const records = [];//new Array(recordCount);
      
      // 使用更高效的Buffer读取方式
      for (let i = 0, offset = 0; i < recordCount; i++, offset += 32) {
        const rec = {
          date: buffer.readUInt32LE(offset),
          open: buffer.readUInt32LE(offset + 4) / 100,
          high: buffer.readUInt32LE(offset + 8) / 100,
          low: buffer.readUInt32LE(offset + 12) / 100,
          close: buffer.readUInt32LE(offset + 16) / 100,
          amount: buffer.readFloatLE(offset + 20),
          volume: buffer.readUInt32LE(offset + 24) / 100
        };
        if(rec.date > date){  break;  }
        records.push(rec);
      }
      return records;
    } catch (err) {
      // 统一错误处理逻辑
      if (err.message.includes('No such file')) {
        return []; // 文件不存在返回空数组
      }
      console.error(`解析TDX日线数据失败[${code}]:`, err.message);
      return []; // 所有错误情况都返回空数组
    }
  }

  /* 通达信5分钟线*.lc5文件和*.lc1文件
      文件名即股票代码
      每32个字节为一个5分钟数据，每字段内低字节在前
      00 ~ 01 字节：日期，整型，设其值为num，则日期计算方法为：
                    year=floor(num/2048)+2004;
                    month=floor(mod(num,2048)/100);
                    day=mod(mod(num,2048),100);
      02 ~ 03 字节： 从0点开始至目前的分钟数，整型
      04 ~ 07 字节：开盘价，float型
      08 ~ 11 字节：最高价，float型
      12 ~ 15 字节：最低价，float型
      16 ~ 19 字节：收盘价，float型
      20 ~ 23 字节：成交额，float型(元)
      24 ~ 27 字节：成交量（股），整型
      28 ~ 31 字节：（保留）  
  */
  /* 远程读取通达信bj sh sz fzline文件夹下的名字, 提取股票代码返回
   * @param {object} -sftp 已经连接上的ssh-sftp client
   * @param {string} -code 代码，如'sh999999'
   * @returns { array } - records, code的所有5分钟周期数据
   */
  async readToDate_TDXMinute5(code, date=39991231){
    const filePath = join(this.tdx_root, "vipdoc", code.substring(0, 2), "fzline", `${code}.lc5`);
    try {
      const buffer = await readFile(filePath);
      // 更严格的文件验证
      if (buffer.length === 0) {
        return []; // 空文件返回空数组
      }
      if (buffer.length % 32 !== 0) {
        throw new Error(`文件长度(${buffer.length})不是32的整数倍, 可能已损坏`);
      }

      const recordCount = buffer.length / 32;
      const records = []; //new Array(recordCount);
      // 使用更高效的Buffer读取方式
      for (let i = 0, offset = 0; i < recordCount; i++, offset += 32) {
          const timeNum = buffer.readUint16LE(offset + 2);
          const rec = {
            date: convertFZDate(buffer.readUint16LE(offset + 0)),
            time: 100*Math.floor(timeNum/60) + timeNum%60, // 格式化时间为"HH:MM"
            open: buffer.readFloatLE(offset + 4),
            high: buffer.readFloatLE(offset + 8),
            low: buffer.readFloatLE(offset + 12),
            close: buffer.readFloatLE(offset + 16),
            amount: buffer.readFloatLE(offset + 20),
            volume: buffer.readUInt32LE(offset + 24) / 100, // 转换为手
          }
          if(rec.date > date){break;}
          records.push(rec);
      }
      return records;
    } catch (err) {
      // 统一错误处理逻辑
      if (err.message.includes('No such file')) {
        return []; // 文件不存在返回空数组
      }
      console.error(`解析TDX日线数据失败[${code}]:`, err.message);
      return []; // 所有错误情况都返回空数组
    }
  }

  all_market_codes = async ()=>{
    const codes = [];
    // merge day
    const day_dirs = [
      join(this.tdx_root,'vipdoc/bj/lday'),
      join(this.tdx_root,'vipdoc/sh/lday'),
      join(this.tdx_root,'vipdoc/sz/lday')
    ]

    for(let d of day_dirs){
      const files = await readdir(d)
      for( let file of files){
        codes.push(removeExtension(file));
      }
    }
    return codes;
  }

  async calendar() {
    try {
      const dataArray = await this.readToDate_TDXDay('sh000001');
      return dataArray.map(item => item.date); // 直接使用 map 提取日期
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
      throw error; // 可选择重新抛出错误或返回默认值（如 return []）
    }
  }
  
}

// 正确导出类
export default TDX_Reader;