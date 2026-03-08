import TDX_Reader  from './index.js'

(async () => {
    const tdxReader = new TDX_Reader('C:/zd_zsone');
   
    const dayArry = await tdxReader.readToDate_TDXDay('sh603233');
    console.log(`dayArry[0]:`, dayArry[0])
    console.log(`dayArry[dayArry.length-1]:`, dayArry[dayArry.length-1])

    // const mArry = await tdxReader.readToDate_TDXMinute5('sh603233');
    // console.log(`mArry[mArry.length-1]:`, mArry[mArry.length-1])

    const codes = await tdxReader.all_market_codes();
    console.log(codes.length);
    console.log(codes);

    const calendar = await tdxReader.calendar();
    console.log(calendar)
    console.log(calendar[calendar.length-1])

})();