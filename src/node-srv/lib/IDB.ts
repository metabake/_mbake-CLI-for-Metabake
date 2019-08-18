
const sqlite3 = require('sqlite3').verbose()

const bcrypt = require('bcryptjs') // to hash passwords
const fs = require('fs-extra')
const logger = require('tracer').console()

import { BaseDB } from 'mbake/lib/BaseDB'
import { iAuth } from 'mbake/lib/Serv'

export class IDB extends BaseDB {

    protected salt

    constructor(path, fn){
        super(path, fn)
        logger.trace(path, fn)
    }

    async isSetupDone() {
        try {
            // if db exists
            if(!this.dbExists())
                return false
            logger.trace(this.path, this.fn)
            this.con()
            const qry = await this.db.prepare('SELECT * FROM CONFIG')// single row in table so no need for where 
            const rows = await this._qry(qry)
            logger.trace(rows)
            if (rows && rows.length) {
                return true
            }
            return false
        }
        catch(e) {
            return false
        }
    }

    async init(): Promise<any> {
        
        if (this.dbExists()) {
            // if db exists, connect an exit
            this.con()
            return
        }//fi

        if (!(this.db)) {
            console.log('no connection made')
            this.con()
        }//fi

        return Promise.all([
            this._run(this.db.prepare(`CREATE TABLE ADMIN  (email, hashPass, vcode)`)), // single row in table
            this._run(this.db.prepare(`CREATE TABLE CONFIG ( emailjsService_id, emailjsTemplate_id, emailjsUser_id, pathToApp, port int)`)), // single row in table
            this._run(this.db.prepare(`CREATE TABLE SALT(salt)`)),
            this._run(this.db.prepare(`CREATE TABLE EDITORS(guid text, name, email, hashPass, last_login_gmt int, vcode)`)),
        ]).then(() => {
            console.log('all tables created')
            let salt = bcrypt.genSaltSync(10)
            const stmt = this.db.prepare(`INSERT INTO SALT(salt) VALUES( ?)`)
            return this._run(stmt, salt)
        })
    }

    async getSalt() {
        if (this.salt) return this.salt
        console.log('IDB', IDB);
        const qry = this.db.prepare('SELECT * FROM SALT')// single row in table so no need for where 
        const rows = await this._qry(qry)
        const row = rows[0]
        this.salt = row.salt
        return this.salt
    }//()

    async setAdmin(email, password, emailjsService_id, emailjsTemplate_id, emailjsUser_id, port: number) {
        const salt = await this.getSalt()
        const hashPass = bcrypt.hashSync(password, salt)

        const stmt1 = this.db.prepare(`INSERT INTO ADMIN(email, hashPass) VALUES(?,?)`);
        this._run(stmt1, email, hashPass);

        const appPath = await fs.realpath(__dirname + '/../../ROOT');
        logger.trace(appPath)

        const stmt2 = this.db.prepare(`INSERT INTO CONFIG(pathToApp, emailjsService_id, emailjsTemplate_id, emailjsUser_id, port) VALUES('` + appPath + `',?,?,?,?)`);
        this._run(stmt2, emailjsService_id, emailjsTemplate_id, emailjsUser_id, port);
    }//()

    async updateConfig(emailjsService_id, emailjsTemplate_id, emailjsUser_id, pathToApp, port) {
        const stmt = this.db.prepare(`UPDATE CONFIG SET emailjsService_id=?, emailjsTemplate_id=?, emailjsUser_id=?, pathToApp=?, port=?`)// single row in table so no need for where
        const res = await this._run(stmt, emailjsService_id, emailjsTemplate_id, emailjsUser_id, pathToApp, port);
        return res;
    }

    async getConfigX() {
        const qry = this.db.prepare(`SELECT * FROM CONFIG`)
        const rows = await this._qry(qry)
        logger.trace(rows)
        if (rows && rows.length > 0) {
            const row = rows[0]
            return row
        } else {
            return false
        }
    }

    async setAppPath(pathToApp) {
        const stmt = this.db.prepare(`UPDATE CONFIG SET pathToApp=? `)
        const res = await this._run(stmt, pathToApp)
        return res
    }

    async getAppPath() {
        const config = await this.getConfigX()
        if(!config) throw new Error('no pathToApp in DB')
        return config.pathToApp
    }

    async getPort() {
        const qry = this.db.prepare('SELECT * FROM CONFIG')
        const rows = await this._qry(qry)
        const row = rows[0]
        return row.port
    }

    getVcodeAdmin() {
        let vcode = Math.floor(1000 + Math.random() * 9000);

        const stmt = this.db.prepare(`UPDATE ADMIN SET vcode=?`)
        this._run(stmt, vcode)
        return vcode
    }//()
    getVcodeEditor(email) {
        let vcode = Math.floor(1000 + Math.random() * 9000);

        const stmt = this.db.prepare(`UPDATE EDITORS SET vcode=? WHERE email=?`)
        this._run(stmt, vcode, email)
        return vcode
    }//()

    async authEditor(email, password) {
        password = Buffer.from(password, 'base64').toString();
        const salt = await this.getSalt()
        const hashPassP = bcrypt.hashSync(password, salt)
        const qry = this.db.prepare('SELECT * FROM EDITORS where email =  ?')
        const rows = await this._qry(qry, email)
        if (rows.length > 0) {
            const row = rows[0];
            const hashPassS = row.hashPass;
            return hashPassP == hashPassS;
        } else {
            return false;
        }
    }//()
    async authAdmin(email, password) {
        const salt = await this.getSalt()
        const hashPassP = bcrypt.hashSync(password, salt)
        const qry = this.db.prepare('SELECT * FROM ADMIN where email = ?')
        const rows = await this._qry(qry, email)

        if (rows.length > 0) {
            const row = rows[0]
            const hashPassS = row.hashPass
            return hashPassP == hashPassS
        } else {
            return false;
        }

    }//()

    /**
     * @param guid You can user ToolBelt's getGUID on browser
     * You can set vcode with the vcode method
     */
    async addEditor(guid, name, email, password) {
        const salt = await this.getSalt()
        const hashPass = bcrypt.hashSync(password, salt)

        const stmt = this.db.prepare(`INSERT INTO EDITORS(guid, name, email, hashPass ) VALUES(?,?, ?,?)`)
        const res = await this._run(stmt, guid, name, email, hashPass)
        return res
    }//()

    /**
     * edit user
     * @param guid You can user ToolBelt's getGUID on browser
     */
    async editEditor(guid, name) {

        if (typeof name !== 'undefined' &&
            typeof guid !== 'undefined'
        ) {

            const stmt = this.db.prepare(`UPDATE editors SET name='${name}' WHERE guid='${guid}'`);
            const res = await this._run(stmt);

            if (res.length > 0) {
                return res;
            } else {
                console.log('res is empty: ', res);
                return false;
            }

        } else {
            console.log('failed to edit user');
        }

    };

    async getEditors() {
        const qry = this.db.prepare(`SELECT guid AS id, name, email FROM editors`)
        const res = await this._qry(qry)
        return res
    }

    async deleteEditor(guid) {
        const stmt = this.db.prepare(`DELETE FROM EDITORS WHERE guid='${guid}'`)
        const res = await this._run(stmt)
        return res
    }

    /**
     * this one is used for uptime server monitoring
     * doesn't matter the count result
     **/
    async monitor() {
        const qry = this.db.prepare(`SELECT COUNT(*) AS count FROM ADMIN`)
        const rows = await this._qry(qry)
        return rows[0]
    }

    async resetPasswordAdminIfMatch(email, vcode, password) {
        // is there a row match?
        const qry = this.db.prepare(`SELECT COUNT(*) AS count FROM ADMIN where email=? and vcode=?`)
        const rows = await this._qry(qry, email, vcode)
        const row = rows[0]
        const count = row.count
        if (!(count == 0)) throw new Error('mismatch')

        const salt = await this.getSalt()
        const hashPass = bcrypt.hashSync(password, salt)
        const stmt = this.db.prepare(`UPDATE ADMIN SET hashPass=?, vcode=null where email=?`)
        this._run(stmt, hashPass, email)
        return 'OK'
    }//()

    async resetPasswordEditorIfMatch(email, vcode, password) {
        // is there a row match?
        const qry = this.db.prepare(`SELECT COUNT(*) AS count FROM EDITORS where email=? and vcode=${vcode}`)
        const rows = await this._qry(qry, email)
        const row = rows[0]
        const count = row.count
        if ((count == 0)) throw new Error('mismatch')

        const salt = await this.getSalt()
        const hashPass = bcrypt.hashSync(password, salt)
        const stmt = this.db.prepare(`UPDATE EDITORS SET hashPass=?, vcode=null WHERE email=?`)
        this._run(stmt, hashPass, email)
        return 'OK'
    }//()

    checkDB(path) {
        return fs.existsSync(path)
    }
    openDB(path, cb) {
        fs.open(path, 'w', cb);
    }

    async connectToDb(dbPath) { // the admin db is set to 'P@ssw0rd!' and you have to change it first time on DB create
        const dbPro = new sqlite3.Database(dbPath)
        this.db = await dbPro
        this.db.configure('busyTimeout', 2 * 1000)
    }

    async connectToDbOnPort(dbPath) {
        let _this = this
        await _this.connectToDb(dbPath)
        const qry = await this.db.prepare('SELECT port FROM CONFIG')
        return await this._qry(qry);
    }

}//()

// Auth section //////////////////////////////////////////////////////////////////
export class EditorAuth implements iAuth {
    db: IDB
    constructor(db) {
        this.db = db
    }//()

    async auth(user: string, pswd: string, resp?: any, ctx?: any): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const ok = await this.db.authEditor(user, pswd)
            if (ok) return resolve('OK')

            this.retErr(resp, 'NO')
            reject('NO')
        })// pro
    }
    retErr(resp: any, msg: any) {
        console.log(msg)
        const ret: any = {} // new return
        ret.errorLevel = -1
        ret.errorMessage = msg
        resp.json(ret)
    }//()
}//class

export class AdminAuth implements iAuth {
    db: IDB
    constructor(db) {
        this.db = db
    }//()

    async auth(user: string, pswd: string, resp?: any, ctx?: any): Promise<string> {

        return new Promise(async (resolve, reject) => {
            const ok = await this.db.authAdmin(user, pswd)
            if (ok) return resolve('OK')

            this.retErr(resp, 'NO')
            reject('NO')
        })// pro
    }
    retErr(resp: any, msg: any) {
        console.log(msg)
        const ret: any = {} // new return
        ret.errorLevel = -1
        ret.errorMessage = msg
        resp.json(ret)
    }//()
}//class

module.exports = {
    IDB, EditorAuth, AdminAuth
}
