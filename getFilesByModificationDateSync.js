import * as fs from 'fs';
import * as path from 'path';

/**
 * 获取指定目录下最后更新时间为特定日期的所有文件名
 * @param directoryPath - 要搜索的目录路径
 * @param targetDate - 目标日期（Date对象或可解析的日期字符串）
 * @param recursive - 是否递归搜索子目录，默认为false
 * @returns Promise<string[]> - 匹配的文件名数组
 */
// async function getFilesByModificationDate(
//   directoryPath: string,
//   targetDate: Date | string,
//   recursive: boolean = false
// ): Promise<string[]> {
//   // 将目标日期转换为Date对象，并设置为当天的开始和结束时间
//   const targetDateObj = typeof targetDate === 'string' 
//     ? new Date(targetDate) 
//     : targetDate;
  
//   // 如果日期无效，抛出错误
//   if (isNaN(targetDateObj.getTime())) {
//     throw new Error('Invalid date provided');
//   }

//   // 获取目标日期的开始时间（00:00:00）
//   const startOfDay = new Date(targetDateObj);
//   startOfDay.setHours(0, 0, 0, 0);
  
//   // 获取目标日期的结束时间（23:59:59.999）
//   const endOfDay = new Date(targetDateObj);
//   endOfDay.setHours(23, 59, 59, 999);

//   const matchingFiles: string[] = [];

//   // 读取目录内容
//   const files = await fs.promises.readdir(directoryPath);

//   for (const file of files) {
//     const filePath = path.join(directoryPath, file);
    
//     try {
//       const stats = await fs.promises.stat(filePath);
      
//       // 如果是目录且需要递归搜索
//       if (stats.isDirectory() && recursive) {
//         const subDirFiles = await getFilesByModificationDate(
//           filePath, 
//           targetDateObj, 
//           recursive
//         );
//         matchingFiles.push(...subDirFiles);
//         continue;
//       }
      
//       // 如果是文件，检查修改时间
//       if (stats.isFile()) {
//         const modTime = stats.mtime;
        
//         // 检查修改时间是否在目标日期范围内
//         if (modTime >= startOfDay && modTime <= endOfDay) {
//           matchingFiles.push(file);
//         }
//       }
//     } catch (error) {
//       console.error(`Error processing ${filePath}:`, error);
//       // 继续处理其他文件
//       continue;
//     }
//   }

//   return matchingFiles;
// }

/**
 * 同步版本的获取文件方法
 */
function getFilesByModificationDateSync(
  directoryPath,
  targetDate,
  recursive = false
) {
  const targetDateObj = typeof targetDate === 'string' 
    ? new Date(targetDate) 
    : targetDate;
  
  if (isNaN(targetDateObj.getTime())) {
    throw new Error('Invalid date provided');
  }

  const startOfDay = new Date(targetDateObj);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDateObj);
  endOfDay.setHours(23, 59, 59, 999);

  const matchingFiles = [];
  const files = fs.readdirSync(directoryPath);

  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    
    try {
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory() && recursive) {
        const subDirFiles = getFilesByModificationDateSync(
          filePath, 
          targetDateObj, 
          recursive
        );
        matchingFiles.push(...subDirFiles);
        continue;
      }
      
      if (stats.isFile()) {
        const modTime = stats.mtime;
        if (modTime >= startOfDay && modTime <= endOfDay) {
          matchingFiles.push(file);
        }
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      continue;
    }
  }

  return matchingFiles;
}

// 使用示例
(async () => {
  try {
    // // 异步方式
    // const files = await getFilesByModificationDate(
    //   './documents', 
    //   '2026-07-12',
    //   true // 递归搜索子目录
    // );
    // console.log('匹配的文件:', files);
    
    // 同步方式
    const filesSync = getFilesByModificationDateSync(
      './capitalStockHistory', 
      new Date('2026-07-8'),
      true
    );
    console.log(`匹配的文件[${filesSync.length}]:`, filesSync);
    
  } catch (error) {
    console.error('Error:', error);
  }
})()

// 导出方法
// export {
//   getFilesByModificationDate,
//   getFilesByModificationDateSync,
//   example
// };