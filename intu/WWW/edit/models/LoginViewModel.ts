
class LoginViewModel {

    login(email, pswd):Promise<boolean> {

        return null
    }

    _save(email, pswd) {
        sessionStorage.set('user', email)
        sessionStorage.set('pswd', pswd)
    }

    // forgot password props

}