import fs from 'node:fs'
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';

//const __filename = fileURLToPath(import.meta.url); // 当前文件绝对路径
//const __dirname = path.dirname(__filename);        // 当前文件所在目录
//const dataDir = path.join(path.dirname(path.dirname(__dirname)), 'data/f10');   // 获取上两级目录

const capital_url = 'http://emweb.securities.eastmoney.com/PC_HSF10/CapitalStockStructure/PageAjax?code=';
const companySummery_url = 'http://emweb.securities.eastmoney.com/PC_HSF10/CompanySurvey/CompanySurveyAjax?code=';
const shareholderResearch_url = 'http://emweb.securities.eastmoney.com/PC_HSF10/ShareholderResearch/PageAjax?code=';

function getTwoDigitRandom() {
  return Math.floor(Math.random() * 200) + 100;
}

function removeExtension(filename) {
  const lastDotIndex = filename.lastIndexOf(".");
  return lastDotIndex === -1 ? filename : filename.slice(0, lastDotIndex);
}

// 运行时的日期yyyymmdd
function nowYYYYMMDD(){
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return(year + month + day);
}
const todayStr = nowYYYYMMDD();

function readBlacklistSync(filePath) {
  try {
    fs.accessSync(filePath);
    let str = fs.readFileSync(filePath, 'utf8');
    let arry = JSON.parse(str);
    return arry;
  } catch {
    return [];
  }
}

function delayRandom(){
    return new Promise((resolve, reject)=>{
        setTimeout(() => {    resolve();    }, getTwoDigitRandom());
    });
}

function net_get_capitalHistory(code){
    return axios.get(capital_url+code);
}

function net_get_companySummery(code){
    return axios.get(companySummery_url+code);
}

function net_get_shareholderResearch(code){
    return axios.get(shareholderResearch_url+code);
}

function runAsync(code, url, dir){
    return new Promise((resolve, reject)=>{
        console.log(url+code);
        delayRandom()
        .then(()=>{    return axios.get(url+code);  })
        .then(res => {
            //console.log(res.data)
            // 加入到黑名单
            if(res.data?.status === -1){
                console.log(res.data)
                reject('股票代码不合法');
            }
            else{
                let fn = path.join(dir, `${code}.json`);
                fs.promises.writeFile(fn, JSON.stringify(res.data, null, 2), 'utf8')
                .then(resolve(), reject('写文件时出错了'));
            }
        }, (err)=>{
            console.log(err);
        })
        .catch(error => {
            console.error(error);
        })
    });
}

function loopit(index, codes, cfgLst, blacklist, retry, cmplt){
    if(index >= codes.length){
        cmplt(null, blacklist);
        return;
    }
    else {
        console.log('take %d/%d\t:%s', index, codes.length, codes[index])
        runAsync(codes[index], cfgLst[0].url, cfgLst[0].dir)
        .then(()=>{    return runAsync(codes[index], cfgLst[1].url, cfgLst[1].dir); })
        .then(()=>{    return runAsync(codes[index], cfgLst[2].url, cfgLst[2].dir); })
        .then(()=>{
            loopit(index + 1, codes, cfgLst, blacklist, 0, cmplt)
        }, (err)=>{
            console.log(err);
            if(err === '股票代码不合法'){
                blacklist.push(codes[index]);   
            }
            loopit(index + 1, codes, cfgLst, blacklist, 0, cmplt)
        })
        .catch((err)=>{
            console.log(err);
            if(retry < 2){
                loopit(index, codes, cfgLst, blacklist, retry+1, cmplt)
            }
            else{
                loopit(index + 1, codes, cfgLst, blacklist, 0, cmplt)
            }
        })
    }  
}

function loopitX(index, codes, cfg, blacklist, retry, cmplt){
    if(index >= codes.length){
        cmplt(null, blacklist);
        return;
    }
    else {
        console.log('take %d/%d\t:%s', index, codes.length, codes[index])
        runAsync(codes[index], cfg.url, cfg.dir)
        .then(()=>{
            loopitX(index + 1, codes, cfg, blacklist, 0, cmplt)
        }, (err)=>{
            console.log(err);
            if(err === '股票代码不合法'){
                blacklist.push(codes[index]);   
            }
            loopitX(index + 1, codes, cfg, blacklist, 0, cmplt)
        })
        .catch((err)=>{
            console.log(err);
            if(retry < 2){
                loopitX(index, codes, cfg, blacklist, retry+1, cmplt)
            }
            else{
                loopitX(index + 1, codes, cfg, blacklist, 0, cmplt)
            }
        })
    }  
}

// 使用默认或运行参数自带
// var goodJsonFN = 'codes.json';
// if(process.argv.length >= 3){
//     goodJsonFN = process.argv[2];
//     console.log(`确保这个文件存在:${0}`, process.argv[2])
// }
const download = (data_f10_dir, xcodes) => {
    console.log(`data_f10_dir: ${data_f10_dir}`);
    console.log(`xcodes: ${xcodes}`);

    return new Promise((resolve, reject) => {
        // 生成文件夹
        Promise.all([
            fs.promises.mkdir(path.join(data_f10_dir, 'capitalStockHistory'), { recursive: true, existOk: true }),
            fs.promises.mkdir(path.join(data_f10_dir, 'companySummery'), { recursive: true, existOk: true }),
            fs.promises.mkdir(path.join(data_f10_dir, 'shareholderResearch'), { recursive: true, existOk: true })
        ]).then(()=>{
            // 将黑名单从xcodes中剔除
            const blacklist = readBlacklistSync(path.join(data_f10_dir, 'blacklist.json'));
            const codes = xcodes.filter(item => !blacklist.includes(item));

            let prcCfgLst = [
                {
                    url: capital_url,
                    dir: path.join(data_f10_dir,'capitalStockHistory')
                },
                {
                    url: companySummery_url,
                    dir: path.join(data_f10_dir,'companySummery')
                },
                {
                    url: shareholderResearch_url,
                    dir: path.join(data_f10_dir,'shareholderResearch')
                }
            ]
            loopit(0, codes, prcCfgLst, blacklist, 0, (err, lst)=>{
                if(err === null){
                    fs.promises.writeFile(path.join(data_f10_dir,'./blacklist.json'), JSON.stringify(lst));
                    resolve();
                }
                else{
                    reject(err);
                }
            });
        })
        .catch((err)=>{ reject(err);   });
    })
}

const download_capitalStockHistory = (data_f10_dir, xcodes)=>{
    return new Promise((resolve, reject) => {
        // 生成文件夹
        fs.promises.mkdir(path.join(data_f10_dir, 'capitalStockHistory'), { recursive: true, existOk: true })
        .then(()=>{
            // 将黑名单从xcodes中剔除
            const blacklist = readBlacklistSync(path.join(data_f10_dir, 'blacklist_capitalStockHistory.json'));
            const codes = xcodes.filter(item => !blacklist.includes(item));
            let prcCfg = {
                url: capital_url,
                dir: path.join(data_f10_dir,'capitalStockHistory')
            }
            loopitX(0, codes, prcCfg, blacklist, 0, (err, lst)=>{
                if(err === null){
                    fs.promises.writeFile(path.join(data_f10_dir,'./blacklist_capitalStockHistory.json'), JSON.stringify(lst));
                    resolve();
                }
                else{
                    reject(err);
                }
            });
        })
        .catch((err)=>{ reject(err);   });
    })
}

const download_companySummery = (data_f10_dir, xcodes)=>{
    console.log(`data_f10_dir:${data_f10_dir}`);
    return new Promise((resolve, reject) => {
        // 生成文件夹
        fs.promises.mkdir(path.join(data_f10_dir, 'companySummery'), { recursive: true, existOk: true })        
        .then(()=>{
            // 将黑名单从xcodes中剔除
            const blacklist = readBlacklistSync(path.join(data_f10_dir, 'blacklist_companySummery.json'));
            const codes = xcodes.filter(item => !blacklist.includes(item));

            let prcCfg = {
                url: companySummery_url,
                dir: path.join(data_f10_dir,'companySummery')
            }

            loopitX(0, codes, prcCfg, blacklist, 0, (err, lst)=>{
                if(err === null){
                    fs.promises.writeFile(path.join(data_f10_dir,'./blacklist_companySummery.json'), JSON.stringify(lst));
                    resolve();
                }
                else{
                    reject(err);
                }
            });
        })
        .catch((err)=>{ reject(err);   });
    })
}

function takeAllLngbbd(data_f10_dir, code){
    let dirs = fs.readdirSync(path.join(data_f10_dir,'capitalStockHistory'), { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    //console.log(dirs);
    let arry = [];
    for(let d of dirs){
        const fn = path.join(data_f10_dir,'capitalStockHistory', d, `${code}.json`);
        try {
            const content = fs.readFileSync(fn);
            const obj = JSON.parse(content);
            arry = arry.concat(obj.lngbbd);
        } catch (error) {
            //console.log(error);
        } 
    }
    return arry;
}

function takeAllCompanysurvey(data_f10_dir, code){
    let dirs = fs.readdirSync(path.join(data_f10_dir,'companySummery'), { withFileTypes: true })
        .filter(x => x.isDirectory())
        .map(x => x.name);
    let arry = [];
    for(let d of dirs){
        const fn = path.join(data_f10_dir,'companySummery', d, `${code}.json`);
        try {
            const content = fs.readFileSync(fn);
            const obj = JSON.parse(content);
            arry.push(obj);
        } catch (error) {
            //console.log(error);
        } 
    }
    return arry;
}

function codesInDirector(data_f10_dir, root){
    let dirs = fs.readdirSync(path.join(data_f10_dir, root), { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    let arry = [];
    const regex = /^(bj|BJ|sh|SH|sz|SZ)[0-9]{6}$/;
    for(let d of dirs){
        let fNames = fs.readdirSync(path.join(data_f10_dir, root, d), { withFileTypes: true })
            .filter(x => x.isFile())
            .map(x => removeExtension(x.name))
            .filter(x => (!arry.includes(x)) && (regex.test(x)));
        arry = arry.concat(fNames);
    }
    return arry;
}

function codesInCapitalStockHistory(data_f10_dir){
    return codesInDirector(data_f10_dir, 'capitalStockHistory');
}

function codesInCompanysurvey(data_f10_dir){
    return codesInDirector(data_f10_dir, 'companySummery');
}

export {
    delayRandom,
    download_capitalStockHistory, 
    download_companySummery,
    download,               // 下载股票的资本结构、公司概况和股东研究
    takeAllLngbbd,          // 从capitalStockHistory目录中获取所有流通股本变动
    takeAllCompanysurvey,   // 从companySummery目录中获取所有公司概况
    codesInCompanysurvey,           // 从companySummery目录中获取所有股票代码
    codesInCapitalStockHistory,     // 从capitalStockHistory目录中获取所有股票代码
    net_get_capitalHistory,         // 获取股票的资本结构
    net_get_companySummery,         // 获取股票的公司概况
    net_get_shareholderResearch     // 获取股票的股东研究
}