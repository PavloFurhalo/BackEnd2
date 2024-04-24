import { Router } from 'express';
import { authorizationMiddleware } from '../middlewares.js';
import { USERS, ADDRESSES } from '../db.js';

export const UserRouter = Router();



UserRouter.post('/users', (req, res) => {
    const { body } = req;
  
    console.log(`body`, JSON.stringify(body));
  
    const isUserExist = USERS.some(el => el.login === body.login);
    if (isUserExist) {
      return res.status(400).send({ message: `user with login ${body.login} already exists` });
    }
  
    const user = {
        ...body,
        role: 'Customer'
    }

    USERS.push(user);
    
  
    res.status(200).send({ message: 'User was created' });
});

UserRouter.post('/admin' , (req , res) => {
    const { body } = req;
  
    console.log(`body`, JSON.stringify(body));
  
    const isUserExist = USERS.some(el => el.login === body.login);
    if (isUserExist) {
      return res.status(400).send({ message: `user with login ${body.login} already exists` });
    }
  
    const user = {
        ...body,
        role: 'Admin'
    }

    USERS.push(user);
    
  
    res.status(200).send({ message: 'Admin was created' });
})


UserRouter.post('/drivers' , (req , res) => {
    const { body } = req;
  
    console.log(`body`, JSON.stringify(body));
  
    const isUserExist = USERS.some(el => el.login === body.login);
    if (isUserExist) {
      return res.status(400).send({ message: `user with login ${body.login} already exists` });
    }
  
    const user = {
        ...body,
        role: 'Driver'
    }

    USERS.push(user);
    
  
    res.status(200).send({ message: 'Driver was created' });
})

UserRouter.get('/users', (req, res) => {
    const users = USERS.map(user => {
      const { password, ...other } = user;
      return other;
    });
    return res
      .status(200)
      .send(users);
});

UserRouter.post('/login', (req, res) => {
    const { body } = req;
  
    const user = USERS
      .find(el => el.login === body.login && el.password === body.password);
  
    if (!user) {
      return res.status(400).send({ message: 'User was not found' });
    }
  
    const token = crypto.randomUUID();
  
    user.token = token;
    USERS.save(user.login, { token });
  
    return res.status(200).send({
      token,
      message: 'User was login'
    });
});