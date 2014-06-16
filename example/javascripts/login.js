var app = {};
var user = {};
var templates = {};

var auth = new WebmakerAuthClient();

auth.on('tokenrequested', function(data, message) {
  app.switchModal('getkey');
});

auth.on('error', function(err) {
  app.closeModals();
  app.notice('Problem signing in: ' + err);
});

auth.on('tokenlogin', function(data) {
  user = data;
  app.closeModals();
  app.setHeader();
  app.notice('Welcome back ' + user.username + ', you are now logged in.');
})

auth.on('logout', function () {
  app.setHeader();
  app.switchPage('home')
  app.notice('You are now logged out.');
});

app.switchPage = function (id) {
  $('.page').hide();
  $('#' + id + 'page').delay(600).fadeIn(300);
};

app.switchModal = function (id) {
  var modal = $('.modal');
  modal.attr('#' + id + 'modal');
  modal.find('.modal-title').html(templates[id].title);
  modal.find('.modal-body').html(templates[id].body);
  modal.find('.modal-footer').html(templates[id].footer);
  if ( templates[id].header ) {
    modal.find('.modal-header').append(templates[id].header);
  }
  app.swapText();
  modal.fadeIn();
  modal.find('input').first().focus();
};


app.swapText = function () {
  $("span.username").text(user.username);
};

app.setHeader = function (state,name) {
  app.swapText();
  $('#signuplink').toggle();
  $('#loginlink').toggle();
  $('#userlink').toggle();
};


app.createUser = function (next) {
  user.email = $('#newemail').val();
  user.name = $('#newusername').val();

  if (user.email === 'matthew@abc.org') {
    app.switchModal('alreadyexists');
  } else {
    app.swapText();
    if ( next === 'hello') {
      app.setHeader();
    }
    app.switchModal(next);
  }
};


app.notice = function (msg) {
  var notice = $('#notice');
  notice.html(msg).fadeIn().delay(3000).fadeOut();
};


app.closeModals = function () {
  $('.modal').fadeOut();

};


app.popupFederated = function () {
    var popup = window.open("http://placekitten.com/g/550/400", "socialsignon", "toolbar=no, location=no, scrollbars=no, resizable=no, status=no, top=500, left=100, width=500, height=300");
    popup.focus();
  // app.setHeader('user','Amira')
  app.notice('Success! You are now logged in.');
};


app.resetForms = function () {
  $('form').each(function () {
    $(this).get(0).reset();
  });
};


app.setListeners = function () {

  $('body').on('click', '.pagelink', function(evt){
    evt.preventDefault();
    var id = $(this).data('page');
    app.switchPage(id);
  });

  $('body').on('click', '.modallink', function(evt){
    evt.preventDefault();
    var id = $(this).data('modal');
    app.switchModal(id);
  });

  // $('.modal').on('click', '.create-user', function () {
  //   var next = $(this).data('next');
  //   console.log('hello?');
  //   app.createUser(next);
  // });

  $('.modal').on('click', '.submit-userid', function () {
    var email = user.email = $('input[name=email]').val();
    auth.request(email);
  });

  $('.modal').on('click', '.submit-key', function () {
    auth.authenticateToken(user.email, $('input[name=key]').val());
  });

  // $('.modal').on('click', '.submit-password', function () {
  //   app.finishLogin();
  // });

  // $('.modal').on('click', '.set-password', function () {
  //   var msg = 'Your password has been added.';
  //   app.finishLogin(msg);
  // });

  // $('.modal').on('click', '.keysubmit', function(evt){
  //   app.notice('Success! You are now logged in.');
  // });

  $('.logout').on('click', function () {
    auth.logout();
  });

  // persona
  $('body').on('click', '.persona', app.popupFederated);

  $('body').on('click', '.close, .start', app.closeModals);

};

templates = {
  signup : {
    title : 'Sign Up',
    body : '<form class="form"> <div class="form-group username-group"> <label for="newemail">Email</label> <input name="newemail" id="newemail" type="email" class="form-control" required=""> </div> <div class="checkbox"> <label> <input name="agreeToTerms" type="checkbox"> I agree to Webmaker\'s <a href="https://webmaker.org/en-US/terms">terms</a> and <a href="https://webmaker.org/en-US/privacy">conditions</a> </label> </div> <button class="create-user btn btn-primary" type="button" data-next="create">Sign Up</button> </form>',
    footer: '',
  },
  create : {
    title : 'Welcome',
    header : '<div class="todo" style="float:right;"><select class="selectized" tabindex="-1" name="supportedLocales" id="supportedLocales"> <option value="en-US" selected="selected">English (US)</option> </select> </div>',
    body : '<form class="form"> <div class="form-group username-group"> <label for="username">Pick a Username</label> <input name="username" id="newusername" class="form-control" required=""> </div> <div class="checkbox"> <label><input name="mailingList" type="checkbox"> Email me updates about Webmaker and other projects</label> </div> <button class="create-user btn btn-primary" type="button" data-next="hello">Create Account</button> </form>',
    footer : '<a class="btn btn-default" href="#">Get Help</a>',
  },
  hello : {
    title : 'Hello <span class="username">[username]</span>',
    body : '<p>Welcome to Webmaker!</p><ul> <li>Check your email to confirm your account.</li> <li>Create your <a href="#profile">profile</a> or explore all the <a href="#explore">projects you can remix</a>!</li> </ul> <p><a class="btn btn-primary start" >Start using <span>[thimble]</span></a></p>',
    footer : '<a class="btn btn-default" href="#">Get Help</a>',
  },
  login : {
    title : 'Login',
    body : '<form class="form"> <div class="form-group username-group"> <label for="email">Email</label> <input name="email" type="email" class="form-control" required=""> </div> <div class="form-group hidden"> <label for="password">Password</label> <input type="password" name="password" required=""> </div> <p>By proceeding, you agree to Webmaker\'s <a href="#">Terms</a> & <a href="#">Privacy Policy</a>.</p> <button class="submit-userid btn btn-primary" type="button">Login</button> </form>',
    footer : '<p>Or login with <a href="#persona" class="persona btn btn-info"><i class="fa fa-user"></i>Persona</a></p>',
  },
  getkey : {
    title : '<i class="fa fa-envelope" style="color:#aaa;"> </i> We emailed you a key',
    body : '<form class="form"> <div class="form-group key-group"> <label for="key">Enter your key to login</label> <input name="key" id="key" class="form-control" required=""> </div> <div class="checkbox"> <label><input name="rememberme" type="checkbox"> Remember me on this device <i class="fa fa-question-circle"></i></label> </div> <a class="submit-key btn btn-primary" href="#">Login</a> </form>',
    footer : '<p>Trouble with key? <a href="#">Get help.</a> Frustrated with these keys? <a class="modallink" data-modal="setpassword" href="#">Set a password</a>.</p>',
  },
  setpassword : {
    title : 'Set your Password',
    body : '<form class="form"> <div class="form-group"> <div class="form-group key-group"> <label for="key">Enter your key one last time</label> <input name="key" id="key" class="form-control" required=""> </div> <label for="password">New Password</label> <input name="password" id="password" class="form-control" required=""> </div> <div class="form-group"> <label for="password2">Password again</label> <input name="password2" class="form-control" required=""> </div> <a class="set-password btn btn-primary" href="#" >Set Password</a> </form> <p><br>You can always add or remove a password from your profile page.</p>',
    footer : '<a class="btn btn-default" href="#">Get Help</a>',
  },
  getpassword : {
    title : 'Enter your Password',
    body : '<form class="form"> <div class="form-group username-group"> <label for="password">Password</label> <input name="password" id="password" class="form-control" required=""> </div> <div class="checkbox"> <label><input name="rememberme" type="checkbox"> Remember me on this device. <i class="fa fa-question-circle"></i></label> </div> <!-- <div class="checkbox"> <label><input name="forgetpassword" type="checkbox"> Delete my password after this login. <i class="fa fa-question-circle"></i></label> </div> --> <a class="submit-key btn btn-primary" href="#">Login</a> </form>',
    footer : '<p>Tired of passwords? We made them optional!<br>Lost your password? We all do sometimes! <a class="modallink" data-modal="getkey" href="#">Fix this problem</a>.</p>',
  },
  usernotfound : {
    title : 'Nobody found :(',
    body : '<p>Are you sure you\'ve been here before?</p> <p>Try to <a class="modallink" data-modal="login" href="#">login</a> with a different username or email address.</p> <p>Or, <a class="modallink" data-modal="signup" href="#">sign Up</a> to create a new account.</p>',
    footer : '<a class="btn btn-default" href="#">Get Help</a>',
  },
  alreadyexists : {
    title : 'Email already exists',
    body : '<p>You can try to <a class="modallink" data-modal="login" href="#">login</a>, or we can <a class="modallink" data-modal="getkey" href="#">email you a Key</a> to jump right in. </p> <p><a class="modallink btn btn-info" data-modal="getkey" href="#">Email me a Key</a></p>',
    footer : '<a class="btn btn-default" href="#">Get Help</a>',
  },
};

app.init = function () {
  app.setListeners();
  $('#userlink').hide();
  app.resetForms();
};


app.init();
