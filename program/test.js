// test.js
import {     
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
} from './index.js';
import TDX_Reader  from './tdx_reader/index.js'

async function dowload_capitial() {
    const tdxReader = new TDX_Reader("C:/zd_zsone");
    const codes = await tdxReader.all_market_codes();
    


    download_capitalStockHistory("bigaf10", codes);
}

async function dowload_companySummery() {
    const tdxReader = new TDX_Reader("C://zd_zsone");
    const codes = await tdxReader.all_market_codes();
    download_companySummery("./bigaf10", codes);
}

(async () => {
    await dowload_companySummery();
    // let codes = takeAllLngbbd("D:/i
    // stock/data/f10", 'sh603233');
    // console.log(codes);
    // codes = takeAllCompanysurvey("D:/istock/data/f10", 'sh603233');
    // console.log(codes);
    // codes = codesInCompanysurvey("D:/istock/data/f10");
    // console.log(codes);
    // codes = codesInCapitalStockHistory("D:/istock/data/f10");
    // console.log(codes);
})();