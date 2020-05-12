const { Router } = require('express');
const nodemailer = require('nodemailer');
const router = new Router();

const User = require('./../models/user');
const bcryptjs = require('bcryptjs');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD
  }
});

router.get('/', (req, res, next) => {
  res.render('index');
});

router.get('/sign-up', (req, res, next) => {
  res.render('sign-up');
});

router.post('/sign-up', (req, res, next) => {

  const generateId = length => {
    const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += characters[Math.floor(Math.random() * characters.length)];
    }
    return token;
  };
  
  const { name, email, password } = req.body;
 
  bcryptjs
    .hash(password, 10)
    .then(hash => {
      return User.create({
        name,
        email,
        passwordHash: hash,
        confirmationCode: generateId(10)
      });
    })
    .then(user => {
      req.session.user = user._id;
          
    transporter
    .sendMail({
      from: `Lab App <${process.env.NODEMAILER_EMAIL}`,
      to: email,
      subject: 'Lab test email',
      html: `<a href="http://localhost:3000/confirm/${user.confirmationCode}">Verify Email</a>`
    })
    .then(result => {
      console.log('email was sent succesfully.');
      console.log(result);
    })

    .catch(error => {
      console.log('error sending the email');
      console.log(error);
    });
    })
    .catch(error => {
      next(error);
    });
});


router.get('/confirm/:confirmCode', (req, res, next) => {
  console.log('rota confirm code');
  const confirmationCode = req.params.confirmCode;
  console.log(confirmationCode);
  User.findOneAndUpdate({confirmationCode},{status: 'Active'}).then(user => {
    if (user) {
      console.log('TEM');
      res.render('confirmation');
    } else {
      console.log('NAO TEM');
      res.render('error');
    }
  })

  //User.find()
})

router.get('/sign-in', (req, res, next) => {
  res.render('sign-in');
});

router.post('/sign-in', (req, res, next) => {
  let userId;
  const { email, password } = req.body;
  User.findOne({ email })
    .then(user => {
      if (!user) {
        return Promise.reject(new Error("There's no user with that email."));
      } else {
        userId = user._id;
        return bcryptjs.compare(password, user.passwordHash);
      }
    })
    .then(result => {
      if (result) {
        req.session.user = userId;
        res.redirect('/');
      } else {
        return Promise.reject(new Error('Wrong password.'));
      }
    })
    .catch(error => {
      next(error);
    });
});

router.post('/sign-out', (req, res, next) => {
  req.session.destroy();
  res.redirect('/');
});

const routeGuard = require('./../middleware/route-guard');

router.get('/private', routeGuard, (req, res, next) => {
  res.render('private');
});

router.get('/profile', (req, res, next) => {
  res.render('profile', {user: req.user});
})




module.exports = router;
