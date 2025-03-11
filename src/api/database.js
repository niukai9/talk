// import { Database } from '@tauri-apps/plugin-sql';
import  Database  from '@tauri-apps/plugin-sql';
import { resourceDir, join } from '@tauri-apps/api/path';
// let db = await Database.load(dbPath);
let db;
let resDir
let dbPath
// // 获取应用根目录路径
// async function init() {
//   resDir = await resourceDir();
//   // 其他逻辑
// }
// init();
// 拼接数据库文件路径
// const dbPath = `sqlite:/talkdb.db`;

export async function initializeDatabase() {
  try {
    if (!db) {
      resDir = await resourceDir();
      dbPath = `sqlite:${resDir}/talkdb.db`;
      db = await Database.load(dbPath);
      console.log("Database loaded successfully.");
    }
    // 加载数据库
    // db = Database.load(dbPath);

    // 创建 sm_checklist 表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS talk (
        talk_id        INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name      TEXT,
        line            INTEGER,
        txt          TEXT,
        split_txt          TEXT,
        arrange_txt          TEXT,
        tags          TEXT,
        status   INTEGER DEFAULT 0 -- 0 for 没标, 1 for 断句中, 2 for 断句完, 3 for 美化完, 4 for 标签完, 9 for 无效
      )
    `);

    console.log("Database initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw new Error("Failed to initialize database: " + error.message);
  }
}

export async function Login(username, password) {
  try {
    if (!db) {
      db = await Database.load(dbPath);
    }
      const result = await db.select("SELECT * from sm_user WHERE username = ? and password=?",[username, password]);
      return result;
    } catch (error) {
      console.error("Failed to fetch Login:", error);
      throw error;
    }
}

export async function getHospital() {
  try {
    if (!db) {
      db = await Database.load(dbPath);
    }
      const result = await db.select("SELECT * FROM sm_device WHERE id = '1'");
      return result;
    } catch (error) {
      console.error("Failed to fetch hsopital:", error);
      throw error;
    }
}

export async function getDevice() {
    try {
      if (!db) {
        db = await Database.load(dbPath);
      }
        const result = await db.select("SELECT * FROM sm_device WHERE id = '1'");
        return result;
      } catch (error) {
        console.error("Failed to fetch device:", error);
        throw error;
      }
}

export async function getCheck(id) {
    try {
      if (!db) {
        db = await Database.load(dbPath);
      }
        const result = await db.select(`SELECT * FROM sm_checklist WHERE user_id = ? `,[id]);
        // const result = await db.select(`SELECT user_id,user_name,birthday,age,phone,sex,check_date,check_item,check_status,
        // img_face_url,img_up_url,img_down_url,img_tongue_url,report_ai,features,tips,create_time,check_end_time ,suwen_id,save_report_time, check_project
        // FROM sm_checklist WHERE user_id = ? `,[id]);
        // const result = await db.select(`SELECT user_id,user_name,birthday,age,phone,sex,check_date,check_item,check_status,
        // ifnull(img_face_url,'') as img_face_url,ifnull(img_up_url,'') as img_up_url,ifnull(img_down_url,'') as img_down_url,ifnull(img_tongue_url,'') as img_tongue_url,
        // ifnull(report_ai,'') as report_ai,ifnull(features,'') as features,ifnull(tips,'') as tips,create_time, ifnull(check_end_time,'') as check_end_time , ifnull(suwen_id,'') as suwen_id
		// 		, ifnull(save_report_time,'') as save_report_time, ifnull(check_project,'') as check_project
        // FROM sm_checklist WHERE user_id = ? `,[id]);
        return result;
      } catch (error) {
        console.error("Failed to fetch getCheck:", error);
        throw error;
      }
}

export async function getCheckByPhone() {
    try {
      if (!db) {
        db = await Database.load(dbPath);
      }
        const result = await db.select(`SELECT * FROM sm_checklist WHERE phone = ? order by user_id desc limit 1`);
        return result;
      } catch (error) {
        console.error("Failed to fetch getCheckByPhone:", error);
        throw error;
      }
}


export async function getTalks() {
  try {
    if (!db) {
      db = await Database.load(dbPath);
    }
    // console.log("dbpath{}",dbPath)
      const result = await db.select(`SELECT file_name,line,talk_id, SUBSTR(txt, 1, 100) AS front_txt, txt, split_txt, LENGTH(txt) AS txtlen FROM talk where status in (0,1) order by txtlen`);
      return result;
    } catch (error) {
      console.error("Failed to fetch getTalks:", error);
      throw error;
    }
}

export async function getChecks(status, checkStartDate, checkEndDate, keyword) {
  try {
    if (!db) {
      db = await Database.load(dbPath);
    }
      let sql1= "SELECT * FROM sm_checklist where check_status=? and ";
      let sql2 = "check_date>=? and check_date<=?";
      let sql4 = "";
      if(status=="1"){
          sql2="date(check_end_time)>=? and date(check_end_time)<=?";
          sql4=" order by check_end_time desc";
      }
      let sql3="and (user_name like '%"+ keyword +"%' or phone like '%" + keyword + "%')"
      const result = await db.select(sql1+sql2+sql3+sql4,[status, checkStartDate, checkEndDate]);
      return result;
    } catch (error) {
      console.error("Failed to fetch getChecks:", error);
      throw error;
    }
}

export async function getChecklist(status, checkStartDate, checkEndDate, keyword) {
  try {
    if (!db) {
      db = await Database.load(dbPath);
    }
      let sql1= "SELECT * FROM sm_checklist where check_status=? and ";
      let sql2 = "check_date>=? and check_date<=?";
      let sql4 = "";
      if(status=="1"){
          sql2="date(check_end_time)>=? and date(check_end_time)<=?";
          sql4=" order by check_end_time desc";
      }
      let sql3="and (user_name like '%"+ keyword +"%' or phone like '%" + keyword + "%')"
      const result = await db.select(sql1+sql2+sql3+sql4,[status, checkStartDate, checkEndDate]);
      return result;
    } catch (error) {
      console.error("Failed to fetch getChecks:", error);
      throw error;
    }
}


// update
export async function endCheck(id, key) {
    try {
      if (!db) {
        db = await Database.load(dbPath);
      }
        const result = await db.execute("UPDATE sm_checklist SET check_status = 1,check_end_time=(strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime')) WHERE "+key+" = ?",[id]);
        return result;
      } catch (error) {
        console.error("Failed to fetch endCheck:", error);
        throw error;
      }
}



export async function updateCheck(check) {
    try {
      if (!db) {
        db = await Database.load(dbPath);
      }
        const result = await db.execute("UPDATE sm_checklist SET features = ?1, tips = ?2, report_ai = ?3,save_report_time=(strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime')) WHERE user_id = ?4",[check.features, check.tips, check.report_ai, check.user_id]);
        return result;
      } catch (error) {
        console.error("Failed to fetch updateCheck:", error);
        throw error;
      }
}

export async function updateSplitTxt(id,split_txt,status) {
  try {
    if (!db) {
      db = await Database.load(dbPath);
    }
      const result = await db.execute("UPDATE talk SET split_txt = ?1,status=?2  WHERE talk_id = ?3",[split_txt, status, id]);
      return result;
    } catch (error) {
      console.error("Failed to fetch updateSplitTxt:", error);
      throw error;
    }
}

export async function updateHospital(id, name, department, phone, address) {
    try {
      if (!db) {
        db = await Database.load(dbPath);
      }
        const result = await db.execute("UPDATE sm_device SET name = ?1, department = ?2, phone = ?3, address=?4 WHERE id = ?5",[name, department, phone, address, id]);
        return result;
      } catch (error) {
        console.error("Failed to fetch updateHospital:", error);
        throw error;
      }
}

export async function updateDevice(device) {
  console.log('database device')
  console.log(device)
    try {
      if (!db) {
        db = await Database.load(dbPath);
      }
        const result = await db.execute("UPDATE sm_device SET name = ?1, department = ?2, phone = ?3, address=?4 ,act_sn = ?5, act_user = ?6, act_pwd = ?7, act_url=?8, model=?9, cameraID=?10, cameraIp=?11, cameraType=?12, show_video=?13 WHERE id = ?14",
        [device.name, device.department, device.phone, device.address, device.act_sn, device.act_user, device.act_pwd, device.act_url, device.model, device.cameraID, device.cameraIp, device.cameraType, device.show_video, device.id]);
        return result;
      } catch (error) {
        console.error("Failed to fetch updateDevice:", error);
        throw error;
      }
}

export async function updateImgUrl(imgName, imgUrl, uid) {
    try {
      if (!db) {
        db = await Database.load(dbPath);
      }
        let sql1= "UPDATE sm_checklist SET "+imgName+" = ? WHERE user_id = ?";
        const result = await db.execute(sql1,[imgUrl, uid]);
        return result;
      } catch (error) {
        console.error("Failed to fetch updateImgUrl:", error);
        throw error;
      }
}

export async function updateOneItem(key, value, uid) {
    try {
      if (!db) {
        db = await Database.load(dbPath);
      }
        let sql1= "UPDATE sm_user SET "+key+" = ? WHERE user_id = ?";
        const result = await db.execute(sql1,[value, uid]);
        return result;
      } catch (error) {
        console.error("Failed to fetch updateOneItem:", error);
        throw error;
      }
}

//insert
export async function newCheck(user_name, birthday, age, phone, sex, check_date, check_item, check_project) {
    try {
      if (!db) {
        db = await Database.load(dbPath);
      }
        const result = await db.execute("INSERT INTO sm_checklist (user_name, birthday, age, phone, sex, check_date, check_item, check_project) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",[user_name, birthday, age, phone, sex, check_date, check_item, check_project]);
        return result;
      } catch (error) {
        console.error("Failed to fetch newCheck:", error);
        throw error;
      }
}

// export async function newCheckSuWen(suwen_id, user_name, birthday, age, phone, sex, check_date, check_item, img_face_url, img_up_url, img_down_url, img_tongue_url, check_project) {
export async function newCheckSuWen(suwenCheck) {
    try {
      if (!db) {
        db = await Database.load(dbPath);
      }
        const result = await db.execute("INSERT INTO sm_checklist (suwen_id,user_name, birthday, age, phone, sex, check_date, check_item, img_face_url,img_up_url,img_down_url,img_tongue_url,check_status,check_end_time, check_project) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,'1',(strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime')), ?)",
        [suwenCheck.suwen_id, suwenCheck.user_name, suwenCheck.birthday, suwenCheck.age, suwenCheck.phone, suwenCheck.sex, suwenCheck.check_date, suwenCheck.check_item, suwenCheck.img_face_url, suwenCheck.img_up_url, suwenCheck.img_down_url, suwenCheck.img_tongue_url, suwenCheck.check_project]);
        return result;
      } catch (error) {
        console.error("Failed to fetch newCheck:", error);
        throw error;
      }
}
