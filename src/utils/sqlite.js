import Database from '@tauri-apps/plugin-sql';

let db = null;
let isConnect = false;

// 基础的数据表
const databseTable = [
    {
        name: 'language',
        sql: `CREATE TABLE language(
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            title TEXT NOT NULL,
            languageText TEXT NOT NULL,
            voice TEXT NOT NULL,
            lastViewId INTEGER DEFAULT 0,
            createTime TEXT DEFAULT (datetime('now', 'localtime'))
        );
        -- COMMENT ON TABLE language IS '存储语言的表';
        -- COMMENT ON COLUMN language.id IS '主键';
        -- COMMENT ON COLUMN language.title IS '语言名称';
        -- COMMENT ON COLUMN language.language IS '语言代码';
        -- COMMENT ON COLUMN language.voice IS '语音名称';
        -- COMMENT ON COLUMN language.lastViewId IS '最后查看的课文ID';
        -- COMMENT ON COLUMN language.createTime IS '创建时间';`
    },{
        name: 'class',
        sql: `CREATE TABLE \`class\`(
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            languageId INTEGER NOT NULL,
            isFinish INTEGER DEFAULT 0,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            translation TEXT,
            filePath TEXT NOT NULL,
            audioFileName TEXT NOT NULL,
            audioSrtJsonName TEXT NOT NULL,
            createTime TEXT DEFAULT (datetime('now', 'localtime'))
        );
        -- COMMENT ON TABLE \`class\` IS '存储课文的表';
        -- COMMENT ON COLUMN \`class\`.id IS '主键';
        -- COMMENT ON COLUMN \`class\`.languageId IS '语言ID';
        -- COMMENT ON COLUMN \`class\`.isFinish IS '是否创建完成，0未完成，1已完成';
        -- COMMENT ON COLUMN \`class\`.title IS '课题名称';
        -- COMMENT ON COLUMN \`class\`.content IS '课题完整的正文';
        -- COMMENT ON COLUMN \`class\`.translation IS '课题的翻译';
        -- COMMENT ON COLUMN \`class\`.filePath IS '音频和字幕文件路径';
        -- COMMENT ON COLUMN \`class\`.audioFileName IS '音频文件名称';
        -- COMMENT ON COLUMN \`class\`.audioSrtJsonName IS '音频字幕JSON文件名称';
        -- COMMENT ON COLUMN \`class\`.createTime IS '创建时间';`
    },{
        name: 'word',
        sql: `CREATE TABLE word(
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            classId INTEGER NOT NULL,
            -- 冗余languageId，此表后续数据量会达到几十万，并且查询 languageId 下的通用单词是一个高频操作，在这种读密集型的应用场景下，查询性能是最应该优先考虑的因素
            languageId INTEGER NOT NULL,
            inlineId INTEGER,
            content TEXT,
            oartOfSpeech TEXT,
            pronunciation TEXT,
            interpretation TEXT,
            other TEXT,
            applicable INTEGER DEFAULT 1,
            spell INTEGER DEFAULT 1,
            startIndex INTEGER NOT NULL,
            sort INTEGER DEFAULT 0,
            createTime TEXT DEFAULT (datetime('now', 'localtime'))
        );
        -- 设置查询索引
        CREATE INDEX idx_word_languageId_applicable ON word (languageId, applicable);
        CREATE INDEX idx_word_classId ON word (classId);
        -- COMMENT ON TABLE word IS '存储单词的表';
        -- COMMENT ON COLUMN word.id IS '主键';
        -- COMMENT ON COLUMN word.classId IS '课题ID';
        -- COMMENT ON COLUMN word.languageId IS '语言ID';
        -- CoMMENT ON COLUMN word.inlineId IS '单词的ID，用于适配同样的单词，避免重复添加';
        -- COMMENT ON COLUMN word.content IS '单词';
        -- COMMENT ON COLUMN word.oartOfSpeech IS '词性';
        -- COMMENT ON COLUMN word.pronunciation IS '单词读音';
        -- COMMENT ON COLUMN word.interpretation IS '单词意思';
        -- COMMENT ON COLUMN word.other IS '单词附加说明';
        -- COMMENT ON COLUMN word.applicable IS '单词的适用性，0只适用本课，1适用本语言全部课文';
        -- COMMENT ON COLUMN word.spell IS '单词是否可以背写';
        -- COMMENT ON COLUMN word.startIndex IS '单词在字幕文件中的数组的下标';
        -- COMMENT ON COLUMN word.sort IS '排序';
        -- COMMENT ON COLUMN word.createTime IS '创建时间';`
    },{
        name: 'option',
        sql: `CREATE TABLE option(
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            nowAiPlatform TEXT DEFAULT 'ChatGLM',
            ChatGLM TEXT,
            DeepSeek TEXT,
            Groq TEXT,
            Google TEXT,
            ChatGPT TEXT,
            annotationPrompt TEXT,
            translationPrompt TEXT,
            annotationRule TEXT DEFAULT 'skip',
            annotationNumber INTEGER DEFAULT 20,
            showOartOfSpeech INTEGER DEFAULT 1,
            playSpeed TEXT DEFAULT '1.0'
        );
        -- COMMENT ON TABLE option IS '存储设置的表';
        -- COMMENT ON COLUMN option.id IS '主键';
        -- COMMENT ON COLUMN option.nowAiPlatform IS '当前使用的AI平台';
        -- COMMENT ON COLUMN option.ChatGLM IS '存储ChatGLM的详细设置';
        -- COMMENT ON COLUMN option.DeepSeek IS '存储DeepSeek的详细设置';
        -- COMMENT ON COLUMN option.Groq IS '存储Groq的详细设置';
        -- COMMENT ON COLUMN option.Google IS '存储Google的详细设置';
        -- COMMENT ON COLUMN option.ChatGPT IS '存储ChatGPT的详细设置';
        -- COMMENT ON COLUMN option.annotationPrompt IS '单词标注的AI提示词';
        -- COMMENT ON COLUMN option.translationPrompt IS '翻译的AI提示词';
        -- COMMENT ON COLUMN option.annotationRule IS 'AI标注单词的规则';
        -- COMMENT ON COLUMN option.annotationNumber IS 'AI单词标注并发数量';
        -- COMMENT ON COLUMN option.showOartOfSpeech IS '是否显示词性条-在显示页面单词下方的不同颜色的条块';
        -- COMMENT ON COLUMN option.playSpeed IS '播放速度';
        `
    },{
        name: 'wordBase64',
        sql: `CREATE TABLE wordBase64(
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            classId INTEGER NOT NULL,
            word TEXT NOT NULL UNIQUE,
            base64 TEXT NOT NULL
        );
        -- 设置wrod索引
        CREATE INDEX idx_wordBase64_word ON wordBase64 (word);
        -- COMMENT ON TABLE wordBase64 IS '存储单词音频的表';
        -- COMMENT ON COLUMN wordBase64.id IS '主键';
        -- COMMENT ON COLUMN wordBase64.classId IS '课文ID，仅用于删除课文时使用';
        -- COMMENT ON COLUMN wordBase64.word IS '单词';
        -- COMMENT ON COLUMN wordBase64.base64 IS '单词音频的base64';`
    }
]

function connect(){
    return new Promise(async (resolve, reject) => {
        if(isConnect){
            resolve();
        }else{
            try {
                db = await Database.load('sqlite:database.db');
                // 初始化数据库
                for (let i = 0; i < databseTable.length; i++) {
                    // 初始化数据库，如果出错，则立即中止，并退出程序
                    await init(databseTable[i].name, databseTable[i].sql).catch((err) => {
                        reject(err);
                        return;
                    });
                }
                // 初始化成功，连接成功
                isConnect = true;
                resolve();

            } catch (error) {
                reject(error);
            }
        }
    })
}

// 数据库初始化
function init(name, sql) {
    return new Promise(async function (resolve, reject) {
        try {
            const result = await db.select("SELECT name FROM sqlite_master WHERE type='table' AND name=$1", [name]);
            if(result.length == 0){
                // 如果表不存在，则创建表
                await db.execute(sql);
                if(name == "option"){
                    // 设置表必须有一条初始数据
                    await insert(name, ["nowAiPlatform"], ["ChatGLM"]);
                }
            }
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}


function disConnect(){
    return new Promise(async (resolve, reject) => {
        try {
            await db.close();

            db = null;
            isConnect = false;
            resolve();
        } catch (error) {
            reject(error);
        }
    })
}

// 处理条件中的?
function placeholderEscape(whereClause, valuesLength){
    let processedWhereClause = whereClause;
    let sql = "";
    if (whereClause) {
        const wherePlaceholders = whereClause.match(/\?/g);
        if (wherePlaceholders) {
            wherePlaceholders.forEach((_, index) => {
                processedWhereClause = processedWhereClause.replace('?', `\$${valuesLength + index + 1}`);
            });
        }
        sql += ` WHERE ${processedWhereClause}`;
    }

    return sql;
}

/**
 * 插入数据的通用函数
 * @param {string} tableName - 表名
 * @param {string[]} columns - 列名数组
 * @param {any[]} values - 值数组
 * @example insert("fingerprint", ["fingerprint", "last_ip", "last_time"], ["1", "2", "3"]).then((data)=>console.log(data)).catch();
 */
function insert(tableName, columns, values){
    return new Promise(async (resolve, reject) => {
        // 动态生成列名和占位符
        const columnNames = columns.join(', ');
        // 占位符为 $1, $2, $3...
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        
        const sql = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;

        try {
            const result = await db.execute(sql, values);
            resolve({
                sql,
                changes: result.rowsAffected,
                lastId: result.lastInsertId
            })
        } catch (error) {
            reject(error);
        }
    })
}

/**
 * 更新数据的通用函数
 * @param {string} tableName - 表名
 * @param {object} data - 要更新的列和值的对象
 * @param {string} whereClause - 可选的 WHERE 条件
 * @param {any[]} whereArgs - 可选的 WHERE 条件参数数组
 * @example update("fingerprint", {fingerprint: "4", last_ip: "5", last_time: "6"}, "id = ?", [4]).then((data)=>console.log(data)).catch((error)=>console.log(error));
 */
function update(tableName, data, whereClause = '', whereArgs = []) {
    return new Promise(async (resolve, reject) => {
        // 提取列和值
        const columns = Object.keys(data);
        const values = Object.values(data);
        // 动态生成 SET 子句，使用 $1, $2, ... 占位符
        const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');
        let sql = `UPDATE ${tableName} SET ${setClause}`;
        // 处理 WHERE 子句中的占位符
        sql += placeholderEscape(whereClause, values.length);
        // 合并更新的值和 WHERE 子句的参数
        const allValues = [...values, ...whereArgs];
        // 执行 SQL
        try {
            const result = await db.execute(sql, allValues);
            resolve({
                sql,
                changes: result.rowsAffected
            })
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * 通用查询函数
 * @param {string} tableName - 表名
 * @param {string[]} columns - 要查询的列名数组，传 `*` 查询所有列
 * @param {string} whereClause - 可选的 WHERE 条件
 * @param {any[]} whereArgs - 可选的 WHERE 条件参数数组
 * @example select("fingerprint", ['*'], 'id = ? OR id = ?', [1,2]).then((data)=>console.log(data)).catch((error)=>console.log(error));
 */
function select(tableName, columns, whereClause = '', whereArgs = []) {
    return new Promise(async (resolve, reject) => {
        // 动态生成查询语句
        const columnList = columns.length > 0 ? columns.join(', ') : '*';
        let sql = `SELECT ${columnList} FROM ${tableName}`;
        if(whereClause){
            sql += placeholderEscape(whereClause, 0);
        }
        
        // 执行查询
        try {
            const result = await db.select(sql, whereArgs);
            resolve({
                sql,
                rows: result
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * 通用删除函数
 * @param {string} tableName - 表名
 * @param {string} whereClause - 可选的 WHERE 条件
 * @param {any[]} whereArgs - 可选的 WHERE 条件参数数组
 * @example deleteData("fingerprint", "id = ?", [1]).then((data)=>console.log(data)).catch((error)=>console.log(error));
 */
function deleteData(tableName, whereClause = '', whereArgs = []) {
    return new Promise(async (resolve, reject) => {
        // 动态生成删除语句
        let sql = `DELETE FROM ${tableName}`;
        if (whereClause) {
            sql += placeholderEscape(whereClause, 0);
        }

        // 执行删除操作
        try {
            const result = await db.execute(sql, whereArgs);
            resolve({
                sql,
                changes: result.rowsAffected
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * 自定义查询函数,自己写SQL和条件
 * @param {string} sql - SQL语句
 * @param {any[]} whereArgs - 可选的 WHERE 条件参数数组
 */
function selectCustom(sql, whereArgs) {
    return new Promise(async (resolve, reject) => {
        // 执行查询
        try {
            const result = await db.select(sql, whereArgs);
            resolve({
                sql,
                rows: result
            });
        } catch (error) {
            reject(error);
        }
    });
}

export {
    connect, disConnect, insert, update, select, deleteData, selectCustom
}