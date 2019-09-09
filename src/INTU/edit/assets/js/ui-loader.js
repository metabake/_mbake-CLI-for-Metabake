
depp.define({
    'scripts': [  '#jquery', '#DOM'],
    'scripts2': [ '#scripts',  '#zebraDate', '#custel'],
    'codeEdit': [ 'codemirror', '#scripts', '//cdn.jsdelivr.net/npm/codemirror@5.48.0/keymap/sublime.js'],
    'cssBot':'/edit/assets/css/spectreBottom.css',

    'intuAPI': ['/intuAPI/IntuAPI.js'],
    'baseVM': ['#RPC', '#intuAPI', '/edit/assets/models/BaseViewModel.js',  ],
    'loginViewModel': ['#baseVM',  '/edit/assets/models/LoginViewModel.js'],
    'editViewModel':  ['#baseVM',  '/edit/assets/models/EditViewModel.js' ],

    'fileUpload': ['uppy'],
})

console.log('?')
depp.require(['scripts2', 'baseVM'], function() {
    console.log('READY')
    depp.require('#cssBot')
})

depp.require('scripts2', function() {
    console.log('scripts2')
    $('.user-name').text(sessionStorage.getItem('user_name'));

    $('.datepicker').Zebra_DatePicker();

    // this needs clean up w/ search - replace and api
    $('.site-brand').text(siteName);

    // redirect on not logged in user. 
    let sesName = sessionStorage['username']
    let sesPass = sessionStorage['password']

    if (typeof sesName === 'undefined'
        || sesName === ''
        || sesName === null
        || typeof sesPass === 'undefined'
        || sesPass === ''
        || sesPass === null) {

            if (window.location.pathname !== '/edit/loginForm' && window.location.pathname !== '/edit/loginForm') {
                console.info('User is not logged in, redirecting to login page ...');
                window.location.replace('/edit/loginForm')
            }
    }//fi

})//depp